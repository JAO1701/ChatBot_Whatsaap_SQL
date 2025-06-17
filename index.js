console.log("Iniciando el bot...");

const { Client, LocalAuth } = require('whatsapp-web.js');
const { OpenAI } = require('openai');
const qrcode = require('qrcode-terminal');
require('dotenv').config();

// Driver de SQLiteCloud
const { Database } = require('@sqlitecloud/drivers');

// === ESQUEMA DE LA BASE DE DATOS ===
const DB_SCHEMA = `
Tabla: artists
Columnas:
- ArtistId (INTEGER, identificador único del artista)
- Name (TEXT, nombre del artista)
`;

// Prompt para generar SQL
const SYSTEM_PROMPT_SQL = `
Eres un asistente experto en bases de datos que solo puede generar código SQL para SQLite.
Tu única tarea es traducir la pregunta de un usuario a una consulta SQL de solo lectura (SELECT) basada en el siguiente esquema:
${DB_SCHEMA}
Reglas estrictas:
1. Tu respuesta DEBE contener únicamente el código SQL.
2. NO agregues explicaciones, comentarios, ni texto introductorio como "\`\`\`sql".
3. La consulta DEBE ser de solo lectura (empezar con SELECT).
4. Utiliza únicamente las tablas y columnas definidas en el esquema.
5. Las preguntas pueden estar en español o inglés. Traduce términos comunes si es necesario.
6. Si los datos obtenidos están vacíos, responde amablemente que no se encontraron resultados. No inventes información.
7. Interpreta sinónimos comunes de "cantidad" como: "cuántos", "hay", "tienen", etc., y responde con COUNT(*) cuando corresponda.
8. Si la pregunta del usuario es ambigua, no se puede responder con el esquema proporcionado, o solicita una operación que no es de lectura (UPDATE, DELETE, INSERT), tu única respuesta debe ser la palabra: ERROR
`;

// Prompt para generar respuesta en lenguaje natural
const SYSTEM_PROMPT_NL = `
Eres un asistente de WhatsApp amigable y servicial.
Tu tarea es tomar la pregunta original de un usuario y los datos (en formato JSON) obtenidos de una base de datos para formular una respuesta clara y concisa en lenguaje natural.
Si los datos están vacíos o indican que no se encontraron resultados, informa al usuario de manera amable.
Nunca menciones que usaste una base de datos o SQL. Simplemente presenta la información.
`;

// INICIALIZACIÓN DE CLIENTES

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

const SQLITECLOUD_CONNECTION_STRING = process.env.SQLITECLOUD_CONNECTION_STRING;
const db = new Database(SQLITECLOUD_CONNECTION_STRING);

async function connectToSQLiteCloud() {
    try {
        const testResult = await db.sql("SELECT 1 AS test_column;");
        console.log('🎉 Conectado a SQLiteCloud con éxito! Resultado de prueba:', testResult);
    } catch (error) {
        console.error('❌ Error al conectar a SQLiteCloud (verificación inicial fallida):', error);
        process.exit(1);
    }
}

const whatsappClient = new Client({
    authStrategy: new LocalAuth(),
    webVersionCache: {
        type: 'remote',
        remotePath: 'https://raw.githubusercontent.com/wppconnect-team/wa-version/main/html/2.2412.54.html',
    }
});

// === EVENTOS DE WHATSAPP ===

whatsappClient.on('qr', (qr) => {
    console.log('--- ESCANEA ESTE CÓDIGO QR CON TU WHATSAPP ---');
    qrcode.generate(qr, { small: true });
    console.log('--------------------------------------------');
});

whatsappClient.on('ready', () => {
    console.log('✅ Cliente de WhatsApp listo y conectado!');
});

whatsappClient.on('disconnected', (reason) => {
    console.log('⚠️ Cliente de WhatsApp desconectado:', reason);
});

// === EVENTO DE MENSAJE ===

whatsappClient.on('message', async (message) => {
    if (message.fromMe) return;

    // Filtro por número autorizado
    if (!isAuthorizedNumber(message.from)) {
        console.log("📵 Mensaje recibido de un número no autorizado");
        return;
    }

    console.log(`[Mensaje recibido de ${message.from}]: ${message.body}`);
    const userQuery = message.body;

    try {
        // PASO 1: Generar SQL
        console.log("Paso 1: Generando consulta SQL...");
        const sqlQuery = await generateSQL(userQuery);
        console.log(`SQL generado: ${sqlQuery}`);

        if (sqlQuery === 'ERROR') {
            await message.reply("Error, no puedo procesar esa consulta. Estoy programado para realizar únicamente operaciones de lectura.");
            return;
        }

        // PASO 2: Validar que sea solo SELECT
        console.log("Paso 2: Verificando seguridad de la consulta...");
        if (!isReadOnly(sqlQuery)) {
            console.error("Error de seguridad: La consulta no es de solo lectura.");
            await message.reply("Error, no puedo procesar esa consulta. Estoy programado para realizar únicamente operaciones de lectura.");
            return;
        }

        // PASO 3: Ejecutar consulta
        console.log("Paso 3: Ejecutando consulta en la base de datos SQLiteCloud...");
        const dbResults = await executeQuery(sqlQuery);
        console.log("Resultados de la DB:", dbResults);

        // PASO 4: Responder en lenguaje natural
        console.log("Paso 4: Generando respuesta final...");
        const finalResponse = await generateNaturalLanguageResponse(userQuery, dbResults);
        console.log(`Respuesta final: ${finalResponse}`);

        // PASO 5: Enviar respuesta
        await message.reply(finalResponse);

    } catch (error) {
        console.error("Ha ocurrido un error en el flujo principal:", error);
        await message.reply("Lo siento, ocurrió un error inesperado al procesar tu solicitud. Por favor, inténtalo nuevamente.");
    }
});

// === INICIALIZAR BOT ===

console.log('Conectando a la base de datos SQLiteCloud...');
connectToSQLiteCloud().then(() => {
    console.log('Inicializando cliente de WhatsApp...');
    whatsappClient.initialize();
}).catch(err => {
    console.error('Fallo al iniciar el bot debido a un error de conexión a la DB:', err);
});

// === FUNCIONES AUXILIARES ===

function isAuthorizedNumber(from) {
    return from.endsWith('5492236711185@c.us');
}

function isReadOnly(sql) {
    const cleaned = sql.trim().toLowerCase();
    return cleaned.startsWith('select') &&
           !/;\s*(drop|insert|delete|update|create|alter)/i.test(cleaned);
}

async function generateSQL(query) {
    try {
        const completion = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [
                { role: 'system', content: SYSTEM_PROMPT_SQL },
                { role: 'user', content: query }
            ],
            temperature: 0,
            max_tokens: 150,
        });
        return completion.choices[0].message.content.trim();
    } catch (error) {
        console.error("Error al generar SQL con OpenAI:", error);
        return 'ERROR';
    }
}

async function executeQuery(sql) {
    if (!db) {
        console.error("❌ La instancia de base de datos SQLiteCloud no está inicializada.");
        throw new Error("Error en la base de datos: Instancia de conexión no disponible.");
    }
    try {
        const rows = await db.sql(sql);
        return rows;
    } catch (error) {
        console.error('❌ Error al ejecutar la consulta en la base de datos SQLiteCloud:', error);
        throw new Error(`Error en la base de datos SQLiteCloud: ${error.message}`);
    }
}

async function generateNaturalLanguageResponse(originalQuery, data) {
    try {
        const completion = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [
                { role: 'system', content: SYSTEM_PROMPT_NL },
                { role: 'user', content: `La pregunta original fue: "${originalQuery}"\n\nLos datos obtenidos son: ${JSON.stringify(data)}` }
            ],
            temperature: 0,
            max_tokens: 200,
        });
        return completion.choices[0].message.content;
    } catch (error) {
        console.error("Error al generar la respuesta en lenguaje natural:", error);
        return "No pude interpretar los resultados, pero la consulta fue exitosa.";
    }
}
