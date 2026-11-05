/**
 * API do Banco de Aulas para Google Sheets.
 *
 * Como usar:
 * 1. Crie uma planilha no Google Sheets.
 * 2. Abra Extensões > Apps Script e cole este arquivo em Code.gs.
 * 3. Execute a função `setup` uma vez e autorize o acesso.
 * 4. Veja o token no registro de execução (Exibir > Registros).
 * 5. Implantar > Nova implantação > App da Web.
 *    Execute como: eu. Quem tem acesso: qualquer pessoa.
 * 6. Copie a URL terminada em /exec e o token para o app.
 *
 * O token fica nas Propriedades do Script, nunca neste arquivo.
 */

var ENTRY_SHEET = 'Lancamentos'
var SETTINGS_SHEET = 'Ajustes'
var TOKEN_PROPERTY = 'API_TOKEN'
var SPREADSHEET_ID_PROPERTY = 'SPREADSHEET_ID'

var ENTRY_HEADERS = [
  'id',
  'data',
  'manha_inicio',
  'manha_fim',
  'tarde_inicio',
  'tarde_fim',
  'observacao',
  'atualizado_em',
]

var SETTINGS_HEADERS = [
  'manha_inicio',
  'manha_fim',
  'tarde_inicio',
  'tarde_fim',
  'minutos_por_aula',
  'dias_uteis',
  'atualizado_em',
]

var DEFAULT_SETTINGS = {
  defaultMorning: { start: '07:15', end: '11:15' },
  defaultAfternoon: { start: '13:00', end: '17:00' },
  minutesPerAula: 45,
  workdays: [1, 2, 3, 4, 5],
}

var TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/
var DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/

function setup() {
  var ss = SpreadsheetApp.getActiveSpreadsheet()
  if (!ss) {
    throw new Error(
      'Abra este script pela planilha em Extensões > Apps Script e execute setup de novo.',
    )
  }

  PropertiesService.getScriptProperties().setProperty(
    SPREADSHEET_ID_PROPERTY,
    ss.getId(),
  )

  ensureSheet_(ss, ENTRY_SHEET, ENTRY_HEADERS)
  var settingsSheet = ensureSheet_(ss, SETTINGS_SHEET, SETTINGS_HEADERS)

  ss.getSheetByName(ENTRY_SHEET).getRange('A:H').setNumberFormat('@')
  settingsSheet.getRange('A:G').setNumberFormat('@')

  if (settingsSheet.getLastRow() < 2) {
    settingsSheet
      .getRange(2, 1, 1, SETTINGS_HEADERS.length)
      .setValues([settingsToRow_(DEFAULT_SETTINGS)])
  }

  var properties = PropertiesService.getScriptProperties()
  var token = properties.getProperty(TOKEN_PROPERTY)
  if (!token) {
    token = Utilities.getUuid().replace(/-/g, '')
    properties.setProperty(TOKEN_PROPERTY, token)
  }

  Logger.log('Token da API: ' + token)
  Logger.log('Agora implante como App da Web e copie a URL terminada em /exec.')
}

function doGet() {
  return json_({ ok: true, message: 'API do Banco de Aulas ativa.' })
}

function doPost(event) {
  try {
    if (!event || !event.postData || !event.postData.contents) {
      return json_({ ok: false, error: 'Corpo da requisição vazio.' })
    }

    var body = JSON.parse(event.postData.contents)
    if (!body || body.token !== getToken_()) {
      return json_({ ok: false, error: 'Token inválido.' })
    }

    var payload = body.payload || {}
    var data

    switch (body.action) {
      case 'load':
        data = loadData_()
        break
      case 'upsertEntry':
        data = upsertEntry_(payload.entry)
        break
      case 'deleteEntry':
        data = deleteEntry_(payload.id)
        break
      case 'saveSettings':
        data = saveSettings_(payload.settings)
        break
      case 'replaceAll':
        data = replaceAll_(payload.data)
        break
      default:
        return json_({ ok: false, error: 'Ação desconhecida: ' + body.action })
    }

    return json_({ ok: true, data: data })
  } catch (error) {
    return json_({
      ok: false,
      error: error && error.message ? error.message : String(error),
    })
  }
}

function loadData_() {
  var ss = getSpreadsheet_()
  return {
    settings: readSettings_(ss.getSheetByName(SETTINGS_SHEET)),
    entries: readEntries_(ss.getSheetByName(ENTRY_SHEET)),
  }
}

function upsertEntry_(entry) {
  assertEntry_(entry)
  return withLock_(function () {
    var ss = getSpreadsheet_()
    var sheet = ensureSheet_(ss, ENTRY_SHEET, ENTRY_HEADERS)
    var row = entryToRow_(entry)

    var rowById = findEntryRowById_(sheet, entry.id)
    var rowByDate = findEntryRowByDate_(sheet, entry.date)

    if (rowById > 0) {
      if (rowByDate > 0 && rowByDate !== rowById) {
        throw new Error('Já existe um lançamento nessa data.')
      }
      sheet.getRange(rowById, 1, 1, ENTRY_HEADERS.length).setValues([row])
      return entry
    }

    if (rowByDate > 0) {
      sheet.getRange(rowByDate, 1, 1, ENTRY_HEADERS.length).setValues([row])
      return entry
    }

    sheet.appendRow(row)
    return entry
  })
}

function deleteEntry_(id) {
  if (!id) throw new Error('ID ausente.')

  return withLock_(function () {
    var ss = getSpreadsheet_()
    var sheet = ensureSheet_(ss, ENTRY_SHEET, ENTRY_HEADERS)
    var lastRow = sheet.getLastRow()

    if (lastRow >= 2) {
      var ids = sheet.getRange(2, 1, lastRow - 1, 1).getValues()
      for (var index = ids.length - 1; index >= 0; index--) {
        if (String(ids[index][0]) === String(id)) {
          sheet.deleteRow(index + 2)
          break
        }
      }
    }

    return { deleted: true }
  })
}

function saveSettings_(settings) {
  assertSettings_(settings)

  return withLock_(function () {
    var ss = getSpreadsheet_()
    var sheet = ensureSheet_(ss, SETTINGS_SHEET, SETTINGS_HEADERS)
    sheet
      .getRange(2, 1, 1, SETTINGS_HEADERS.length)
      .setValues([settingsToRow_(settings)])
    return settings
  })
}

function replaceAll_(data) {
  if (!data || !Array.isArray(data.entries)) {
    throw new Error('Dados inválidos para importação.')
  }
  assertSettings_(data.settings)
  data.entries.forEach(assertEntry_)

  return withLock_(function () {
    var ss = getSpreadsheet_()
    var entriesSheet = ensureSheet_(ss, ENTRY_SHEET, ENTRY_HEADERS)
    var settingsSheet = ensureSheet_(ss, SETTINGS_SHEET, SETTINGS_HEADERS)

    var lastRow = entriesSheet.getLastRow()
    if (lastRow > 1) {
      entriesSheet
        .getRange(2, 1, lastRow - 1, ENTRY_HEADERS.length)
        .clearContent()
    }

    if (data.entries.length > 0) {
      var rows = data.entries.map(entryToRow_)
      entriesSheet
        .getRange(2, 1, rows.length, ENTRY_HEADERS.length)
        .setValues(rows)
    }

    settingsSheet
      .getRange(2, 1, 1, SETTINGS_HEADERS.length)
      .setValues([settingsToRow_(data.settings)])

    return loadData_()
  })
}

function readEntries_(sheet) {
  if (!sheet || sheet.getLastRow() < 2) return []

  var values = sheet
    .getRange(2, 1, sheet.getLastRow() - 1, ENTRY_HEADERS.length)
    .getValues()

  var entries = []
  for (var index = 0; index < values.length; index++) {
    var row = values[index]
    if (!row[0] || !row[1]) continue

    var date = dateToText_(row[1])
    if (!DATE_PATTERN.test(date)) continue

    entries.push({
      id: String(row[0] || ''),
      date: date,
      morning: rangeFromRow_(row[2], row[3]),
      afternoon: rangeFromRow_(row[4], row[5]),
      note: String(row[6] || ''),
      updatedAt: String(row[7] || ''),
    })
  }

  entries.sort(function (a, b) {
    return a.date.localeCompare(b.date)
  })
  return entries
}

function readSettings_(sheet) {
  if (!sheet || sheet.getLastRow() < 2) return DEFAULT_SETTINGS

  var row = sheet
    .getRange(2, 1, 1, SETTINGS_HEADERS.length)
    .getValues()[0]

  var workdays = String(row[5] || '')
    .split(',')
    .map(Number)
    .filter(function (day) {
      return day >= 0 && day <= 6
    })

  return {
    defaultMorning: {
      start: timeToText_(row[0]) || DEFAULT_SETTINGS.defaultMorning.start,
      end: timeToText_(row[1]) || DEFAULT_SETTINGS.defaultMorning.end,
    },
    defaultAfternoon: {
      start: timeToText_(row[2]) || DEFAULT_SETTINGS.defaultAfternoon.start,
      end: timeToText_(row[3]) || DEFAULT_SETTINGS.defaultAfternoon.end,
    },
    minutesPerAula:
      Number(row[4]) > 0 ? Number(row[4]) : DEFAULT_SETTINGS.minutesPerAula,
    workdays: workdays.length > 0 ? workdays : DEFAULT_SETTINGS.workdays,
  }
}

function assertEntry_(entry) {
  if (!entry || typeof entry !== 'object') {
    throw new Error('Lançamento inválido.')
  }
  if (!DATE_PATTERN.test(String(entry.date || ''))) {
    throw new Error('Data inválida no lançamento.')
  }
  if (!entry.id) {
    throw new Error('Lançamento sem ID.')
  }
  assertRange_(entry.morning, 'manhã')
  assertRange_(entry.afternoon, 'tarde')
}

function assertRange_(range, label) {
  if (!range) return
  if (
    !range ||
    !TIME_PATTERN.test(String(range.start || '')) ||
    !TIME_PATTERN.test(String(range.end || ''))
  ) {
    throw new Error('Horários inválidos no período da ' + label + '.')
  }
  if (String(range.end) <= String(range.start)) {
    throw new Error('No período da ' + label + ', o fim deve ser depois do início.')
  }
}

function assertSettings_(settings) {
  if (!settings) throw new Error('Ajustes inválidos.')
  assertRange_(settings.defaultMorning, 'manhã')
  assertRange_(settings.defaultAfternoon, 'tarde')
  if (!(Number(settings.minutesPerAula) > 0)) {
    throw new Error('Minutos por aula deve ser maior que zero.')
  }
  if (!Array.isArray(settings.workdays) || settings.workdays.length === 0) {
    throw new Error('Escolha pelo menos um dia útil.')
  }
}

function settingsToRow_(settings) {
  return [
    settings.defaultMorning.start,
    settings.defaultMorning.end,
    settings.defaultAfternoon.start,
    settings.defaultAfternoon.end,
    settings.minutesPerAula,
    settings.workdays.join(','),
    new Date().toISOString(),
  ]
}

function entryToRow_(entry) {
  return [
    entry.id,
    entry.date,
    entry.morning ? entry.morning.start : '',
    entry.morning ? entry.morning.end : '',
    entry.afternoon ? entry.afternoon.start : '',
    entry.afternoon ? entry.afternoon.end : '',
    entry.note || '',
    entry.updatedAt || new Date().toISOString(),
  ]
}

function rangeFromRow_(start, end) {
  if (!start || !end) return null
  return { start: timeToText_(start), end: timeToText_(end) }
}

function findEntryRowById_(sheet, id) {
  if (!id || sheet.getLastRow() < 2) return 0

  var values = sheet.getRange(2, 1, sheet.getLastRow() - 1, 1).getValues()

  for (var index = 0; index < values.length; index++) {
    if (String(values[index][0]) === String(id)) return index + 2
  }
  return 0
}

function findEntryRowByDate_(sheet, date) {
  if (sheet.getLastRow() < 2) return 0

  var values = sheet
    .getRange(2, 2, sheet.getLastRow() - 1, 1)
    .getValues()

  for (var index = 0; index < values.length; index++) {
    if (dateToText_(values[index][0]) === date) return index + 2
  }
  return 0
}

function ensureSheet_(ss, name, headers) {
  var sheet = ss.getSheetByName(name)
  if (!sheet) sheet = ss.insertSheet(name)

  sheet.getRange(1, 1, 1, headers.length).setValues([headers])
  sheet.setFrozenRows(1)
  return sheet
}

function withLock_(callback) {
  var lock = LockService.getScriptLock()
  lock.waitLock(20000)
  try {
    return callback()
  } finally {
    lock.releaseLock()
  }
}

function getSpreadsheet_() {
  var id = PropertiesService.getScriptProperties().getProperty(
    SPREADSHEET_ID_PROPERTY,
  )
  if (!id) {
    throw new Error('Execute a função setup uma vez antes de usar a API.')
  }
  return SpreadsheetApp.openById(id)
}

function getToken_() {
  return PropertiesService.getScriptProperties().getProperty(TOKEN_PROPERTY)
}

function json_(value) {
  return ContentService.createTextOutput(JSON.stringify(value)).setMimeType(
    ContentService.MimeType.JSON,
  )
}

function dateToText_(value) {
  if (value instanceof Date) {
    return Utilities.formatDate(
      value,
      Session.getScriptTimeZone(),
      'yyyy-MM-dd',
    )
  }
  return String(value || '').slice(0, 10)
}

function timeToText_(value) {
  if (value instanceof Date) {
    return Utilities.formatDate(
      value,
      Session.getScriptTimeZone(),
      'HH:mm',
    )
  }

  var text = String(value || '')
  var match = /^(\d{1,2}):(\d{2})/.exec(text)
  if (!match) return text
  return ('0' + match[1]).slice(-2) + ':' + match[2]
}
