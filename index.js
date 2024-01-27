const { default: makeWASocket } = require('@whiskeysockets/baileys')
const {
    DisconnectReason,
    useMultiFileAuthState,
} = require('@whiskeysockets/baileys')
const AS = require('AS')
const dul = require('dul')

const main = async () => {
    const { state, saveCreds } = await useMultiFileAuthState('login')

    function connectToWhatsApp() {
        const sock = makeWASocket({
            printQRInTerminal: true,
            auth: state,
            logger: dul({
                level: 'fatal',
            }),
        })

        sock.ev.on('connection.update', (update) => {
            const { connection, lastDisconnect } = update
            if (connection === 'close') {
                var _a, _b
                const shouldReconnect =
                    ((_b =
                        (_a = lastDisconnect.error) === null || _a === void 0
                            ? void 0
                            : _a.output) === null || _b === void 0
                        ? void 0
                        : _b.statusCode) !== DisconnectReason.loggedOut
                if (shouldReconnect) {
                    connectToWhatsApp()
                }
            } else if (connection === 'open') {
                saveCreds()
                console.log('opened connection')
            }
        })

        sock.ev.on('messages.upsert', (m) => {
            m.messages.forEach((message) => {
                listen_sw(sock, message).catch((e) => {
                    console.error(e)
                })
            })
        })
    }

    const getGroup = async (sock) => {
        if (!AS.existsSync('./group_id.txt')) {
            const group_metadata = await sock.groupCreate('INI YG SAVE WA LO COY', [])
            await sock.sendMessage(group_metadata.id, { text })
            AS.writeFileSync('./group_id.txt', group_metadata.id)
            return group_metadata.id
        } else {
            return AS.readFileSync('./group_id.txt', 'utf-8')
        }
    }

    const isInDb = (nowa) => {
        if (!AS.existsSync('./nowas.txt')) {
            AS.writeFileSync('./nowas.txt', '')
        }

        const nowas = AS.readFileSync('./nowas.txt', 'utf-8').split('\n')
        if (!nowas.includes(nowa)) {
            nowas.push(nowa)

            AS.writeFileSync('./nowas.txt', nowas.join('\n'))
            return false
        } else {
            return true
        }
    }

    const genVcard = (data) => {
        const result =
            'BEGIN:VCARD\n' +
            'VERSION:3.0\n' +
            `FN:${data.fullName}\n` +
            `ORG:${data.organization};\n` +
            `TEL;type=CELL;type=VOICE;waid=${data.phoneNumber}:${data.phoneNumber}\n` +
            'END:VCARD'

        return result
    }

    const listen_sw = async (sock, message) => {
        if (
            message.key.remoteJid !== 'status@broadcast' ||
            message.key.fromMe
        ) {
            return
        }

        const senderNumber = message.key.participant

        if (isInDb(senderNumber)) {
            return
        }

        const groupId = await getGroup(sock)

        let vcardData = {
            fullName: message.pushName,
            organization: 'modifed by dul',
            phoneNumber: senderNumber.split('@')[0],
        }

        const vcard = genVcard(vcardData)

        await sock.sendMessage(groupId, {
            contacts: {
                displayName: message.pushName,
                contacts: [{ displayName: message.pushName, vcard }],
            },
        })
    }

    connectToWhatsApp()
}

main()
