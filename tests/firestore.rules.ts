import { readFileSync } from 'node:fs'
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing'
import {
  deleteDoc,
  doc,
  getDoc,
  setDoc,
} from 'firebase/firestore'
import { afterAll, afterEach, beforeAll, describe, it } from 'vitest'

const PROJECT_ID = 'banco-de-aulas-rules-test'
const OWNER_UID = 'owner-uid'
const OTHER_UID = 'other-uid'
const EMAIL = 'giuliovalcanaia@gmail.com'

let testEnv: RulesTestEnvironment

function authTime(daysAgo = 0): number {
  return Math.floor(Date.now() / 1000) - daysAgo * 24 * 60 * 60
}

function context(
  uid = OWNER_UID,
  email = EMAIL,
  emailVerified = true,
  daysAgo = 0,
) {
  return testEnv
    .authenticatedContext(uid, {
      email,
      email_verified: emailVerified,
      auth_time: authTime(daysAgo),
    })
    .firestore()
}

function entryRef(db: ReturnType<typeof context>, date = '2026-11-05') {
  return doc(db, 'users', OWNER_UID, 'entries', date)
}

function validEntry(date = '2026-11-05') {
  return {
    date,
    morning: { start: '07:15', end: '11:15' },
    afternoon: { start: '13:00', end: '17:00' },
    note: '',
  }
}

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: {
      rules: readFileSync('firestore.rules', 'utf8'),
      host: '127.0.0.1',
      port: 8080,
    },
  })
})

afterEach(async () => {
  await testEnv.clearFirestore()
})

afterAll(async () => {
  await testEnv.cleanup()
})

describe('firestore.rules', () => {
  it('permite o dono autorizado gravar e ler o próprio dia', async () => {
    const db = context()

    await assertSucceeds(setDoc(entryRef(db), validEntry()))
    await assertSucceeds(getDoc(entryRef(db)))
  })

  it('permite outro e-mail verificado gravar apenas os próprios dados', async () => {
    const otherEmail = 'professor@escola.com.br'
    const otherDb = context(OTHER_UID, otherEmail)
    const ownerRef = doc(otherDb, 'users', OTHER_UID, 'entries', '2026-11-05')
    const foreignRef = entryRef(otherDb)

    await assertSucceeds(setDoc(ownerRef, validEntry()))
    await assertFails(setDoc(foreignRef, validEntry()))
  })

  it('nega outro uid', async () => {
    const db = context(OTHER_UID)

    await assertFails(setDoc(entryRef(db), validEntry()))
  })

  it('nega e-mail não verificado', async () => {
    const db = context(OWNER_UID, EMAIL, false)

    await assertFails(setDoc(entryRef(db), validEntry()))
  })

  it('nega sessão com mais de 30 dias', async () => {
    const db = context(OWNER_UID, EMAIL, true, 31)

    await assertFails(setDoc(entryRef(db), validEntry()))
  })

  it('aceita sessão com 29 dias', async () => {
    const db = context(OWNER_UID, EMAIL, true, 29)

    await assertSucceeds(setDoc(entryRef(db), validEntry()))
  })

  it('nega data divergente do id do documento', async () => {
    const db = context()

    await assertFails(
      setDoc(entryRef(db, '2026-11-05'), validEntry('2026-11-06')),
    )
  })

  it('nega horário inválido e observação muito longa', async () => {
    const db = context()

    await assertFails(
      setDoc(entryRef(db), {
        ...validEntry(),
        morning: { start: '25:00', end: '11:15' },
      }),
    )

    await assertFails(
      setDoc(entryRef(db), {
        ...validEntry(),
        note: 'x'.repeat(501),
      }),
    )
  })

  it('permite exclusão pelo dono', async () => {
    const db = context()
    await assertSucceeds(setDoc(entryRef(db), validEntry()))
    await assertSucceeds(deleteDoc(entryRef(db)))
  })

  it('permite ajustes válidos e nega inválidos', async () => {
    const db = context()
    const settingsRef = doc(db, 'users', OWNER_UID, 'settings', 'main')

    await assertSucceeds(
      setDoc(settingsRef, {
        defaultMorning: { start: '07:15', end: '11:15' },
        defaultAfternoon: { start: '13:00', end: '17:00' },
        minutesPerAula: 45,
        workdays: [1, 2, 3, 4, 5],
      }),
    )

    await assertFails(
      setDoc(settingsRef, {
        defaultMorning: { start: '07:15', end: '11:15' },
        defaultAfternoon: { start: '13:00', end: '17:00' },
        minutesPerAula: 0,
        workdays: [1, 2, 3, 4, 5],
      }),
    )
  })

  it('nega subcoleções desconhecidas', async () => {
    const db = context()

    await assertFails(
      setDoc(doc(db, 'users', OWNER_UID, 'outra', 'documento'), {
        qualquer: true,
      }),
    )
  })

  it('nega acesso sem autenticação', async () => {
    const db = testEnv.unauthenticatedContext().firestore()

    await assertFails(getDoc(entryRef(db)))
  })
})
