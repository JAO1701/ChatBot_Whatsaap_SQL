# 🤖 Chatbot de WhatsApp con Inteligencia Artificial integrada para la generación de consultas SQL en una DB privada

## Descripción del Proyecto

Este repositorio contiene el código de un bot de WhatsApp diseñado para interactuar con una base de datos SQL. Su objetivo principal es responder preguntas del cliente sobre su base de datos mediante la interfaz de whatsaap.

## Características Principales

* **Integración con WhatsApp:** Utiliza la librería whatsapp-web.js, para enviar y recibir mensajes mediante una instancia de whatsaapweb de un número del cliente.
* **Conexión a Base de Datos SQL:** Persistencia de datos mediante SQLite, para los datos de usuarios. (Puede adaptarse a otras DB, pero habría que modificar el código)
  * Además posee filtros de sólo lectura (seguridad e integridad de la DB).
  * Y también un filtro de números autorizados para interactuar con el Bot.

## Tecnologías Utilizadas

* **Lenguaje de Programación:** JavaScript (Node.js).
* **Framework/Librería de WhatsApp:** whatsapp-web.js.
* **Base de Datos:** SQLite (Cloud).
* **Conector de Base de Datos:** sqlitecloud/drivers
* * **Variables de Entorno:** dotenv.

## Pre-requisitos

Antes de ejecutar este bot, asegúrate de tener instalado lo siguiente:

* **Node.js** (versión 14 o superior recomendada)
* **npm** (Node Package Manager) o **Yarn**
* Una instancia de tu **base de datos SQL** configurada y accesible.
* Credenciales de acceso a la API de Open AI.

## Instalación y Configuración

Sigue estos pasos para poner en marcha el bot en tu entorno local:

1.  **Clona el repositorio:**
    ```bash
    git clone https://github.com/JAO1701/ChatBot_Whatsaap_SQL.git
    cd Bot-whatsaap_sql
    ```
    
2.  **Instala las dependencias:**
    ```bash
    npm install
    # o si usas yarn
    # yarn install
    ```

3.  **Configura las variables de entorno:**
    Crea un archivo `.env` en la raíz del proyecto (al mismo nivel que `package.json`) y añade tus credenciales y configuración. **Este archivo NO debe subirse a GitHub.**

    Ejemplo de `.env`:
    ```env
    OPENAI_API_KEY=
    SQLITECLOUD_CONNECTION_STRING=
    ```
    **Asegúrate de reemplazar los valores de ejemplo con tus datos reales.**

4.  **Configura tu base de datos:**
    * Asegúrate de que tu base de datos [**Menciona el tipo de DB**] esté corriendo.
    * Crea la base de datos si aún no existe (`tu_nombre_db`).
    * Actualiza el Número autorizado para interactuar con el bot.
    * Actualiza el schema de tu DB para el LLM.
    
## Uso

Para iniciar el bot, ejecuta el siguiente comando:

"node index.js"
