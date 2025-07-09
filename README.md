# Text-to-Speech Generator

This is a full-stack web application that allows users to convert text into natural-sounding speech using Google Cloud Text-to-Speech API. Users can preview voices, synthesize speech, save generated audio files, and play/delete them directly from the web interface.

## Features

- **Text-to-Speech Synthesis:** Convert any text into spoken audio.
- **Voice Previewer:** Listen to various Google Cloud Text-to-Speech voices and adjust speaking rate and pitch before synthesis.
- **SSML Support:** Utilize Speech Synthesis Markup Language (SSML) to add pauses, emphasize words, and control pronunciation.
- **Saved Speeches:** All generated audio files are saved and listed for later playback or deletion.
- **Dark/Light Mode:** Toggle between dark and light themes for user comfort.
- **Active Storage:** Efficiently store audio files associated with speech records.

## Technologies Used

### Backend (Rails API)

- **Ruby on Rails 7.1:** API-only backend.
- **PostgreSQL:** Database for storing speech metadata.
- **Google Cloud Text-to-Speech API:** For speech synthesis.
- **Google Cloud SDK (google-cloud-text_to_speech gem):** Ruby client for GCP TTS.
- **Active Storage:** For managing and storing audio files.
- **Puma:** Web server.

### Frontend (React)

- **React 18:** Frontend JavaScript library.
- **Vite:** Fast build tool for React.
- **TypeScript:** For type-safe JavaScript.
- **Fetch API:** For communicating with the Rails API.

### Infrastructure

- **Docker:** Containerization platform.
- **Docker Compose:** For orchestrating the multi-service (Rails API, PostgreSQL, React) application.

## Prerequisites

Before you begin, ensure you have the following installed on your system:

- [Docker Desktop](https://www.docker.com/products/docker-desktop) (includes Docker Compose)

## Google Cloud Platform (GCP) Setup

This application relies on the Google Cloud Text-to-Speech API. You'll need to set up a GCP project and credentials:

1.  **Create a Google Cloud Project:** If you don't have one, create a new project in the [Google Cloud Console](https://console.cloud.google.com/).
2.  **Enable the Text-to-Speech API:**
    - In your GCP project, navigate to "APIs & Services" > "Enabled APIs & services".
    - Search for "Cloud Text-to-Speech API" and enable it.
3.  **Create a Service Account Key:**
    - Go to "IAM & Admin" > "Service Accounts".
    - Create a new service account. Grant it the "Cloud Text-to-Speech User" role (or a custom role with `texttospeech.synthesize` permission).
    - **Generate a new JSON key** for this service account. Download this JSON file.
    - **Rename this JSON file to `google-credentials.json`** and place it directly inside your `later_augment_api/config` directory (the Rails application root). **Do NOT commit this file to version control!** It is a sensitive secret.

## Setup and Launch

Follow these steps to get the application up and running using Docker Compose:

1.  **Clone the Repository:**

    ```bash
    git clone <your-repository-url>
    cd <your-repository-name> # e.g., cd text-to-speech-app
    ```

2.  **Set up Environment Variables:**
    Create a new file named `.env` in the **root directory of your project** (where `docker-compose.yml` is located). This file will contain sensitive configuration. You can copy the structure from `sample.env`:

    ```bash
    cp sample.env .env
    ```

    Now, open the `.env` file and fill in your actual values:

    ```env
    # --- Rails Application Configuration ---
    # This is a critical security key. Generate a new one in your Rails container:
    # docker compose run --rm web bundle exec rails secret
    RAILS_SECRET_KEY_BASE="your_generated_rails_secret_key_here"

    # --- Google Cloud Platform (GCP) Credentials for Rails API ---
    # Your Google Cloud Project ID (e.g., "my-gcp-project-12345")
    GOOGLE_CLOUD_PROJECT="your_google_cloud_project_id"

    # --- Frontend (React) API URL ---
    # This variable tells your React app where your Rails API is running.
    VITE_RAILS_API_URL="http://localhost:3000/api/v1"

    # --- Optional: Database Configuration (if not using default SQLite in Rails dev) ---
    # Example for PostgreSQL:
    POSTGRES_DB=later_augment_development
    POSTGRES_USER=postgres
    POSTGRES_PASSWORD=password
    ```

    **Important:** Do NOT share your `.env` file or commit it to version control. It is already included in `.gitignore`.

3.  **Update Rails Configuration for Active Storage:**
    Ensure Rails is configured to serve static files in `development` mode, which is necessary for Active Storage to serve your audio files.

    Open `later_augment_api/config/environments/development.rb` and make sure the following line is set to `true`:

    ```ruby
    # later_augment_api/config/environments/development.rb
    config.public_file_server.enabled = true
    ```

4.  **Build and Start Docker Containers:**
    This command will build your Docker images (if not built yet), create the necessary volumes, and start all services. The `--build` flag ensures that any changes to your Dockerfiles or dependencies are picked up.

    ```bash
    docker compose up --build
    ```

    This might take some time on the first run.

5.  **Create and Migrate the Database:**
    Once the services are running, you need to create your database and run migrations. This includes migrations for Active Storage.

    Open a **new terminal** and run the following commands:

    ```bash
    # Create the database
    docker compose run --rm web bundle exec rails db:create

    # Install Active Storage migrations (if not already done via existing migrations)
    # If your db/schema.rb already contains Active Storage tables, you might skip this.
    # But it's safe to run:
    docker compose run --rm web bundle exec rails active_storage:install

    # Run all pending migrations
    docker compose run --rm web bundle exec rails db:migrate
    ```

    **Note on `audio_url` column:** If you previously had an `audio_url` column in your `speeches` table (as `t.string "audio_url"` in `db/schema.rb`), it's recommended to remove it as Active Storage does not use it. If you ran the migration to remove it (as suggested in previous steps), your `db:migrate` command above would have applied that too.

## Usage

1.  **Access the Application:**
    Once all Docker services are running and migrations are complete, open your web browser and navigate to:

    ```
    http://localhost:5173
    ```

    This is where your React frontend is served.

2.  **Synthesize Speech:**

    - In the "Voice Previewer" section, select a language, voice, and adjust speaking rate/pitch to find your preferred voice.
    - In the "Generate Speech from Text" text area, enter the text you want to synthesize.
    - **For Pauses (SSML):** To add pauses or other speech nuances, wrap your text in `<speak>` tags and use SSML tags like `<break time="1s"/>` or `<break strength="medium"/>`, `<p>`, `<s>`.
      Example:
      ```xml
      <speak>
        Hello. <break time="750ms"/> This is a short pause.
        <break strength="strong"/> This is a longer, natural pause.
        <p>And this is a new paragraph.</p>
        <s>This is a new sentence.</s>
      </speak>
      ```
    - Click the "Synthesize Speech" button.

3.  **Play and Manage Saved Speeches:**
    - Newly synthesized speeches (and previous ones) will appear in the "Saved Speeches" section.
    - Each saved speech will have its text, metadata, an audio player, and a "Delete" button.
    - Use the audio player controls to listen to the speech.
    - Click "Delete" to remove a speech record and its associated audio file.

## Troubleshooting

- **`Connection refused` to PostgreSQL (`db` service):**
  - Ensure the `db` service is healthy in `docker compose ps`.
  - Check your `later_augment_api/config/database.yml` to confirm the `host` is `db`.
  - Ensure your `DATABASE_URL` environment variable in `.env` is correct.
- **`404 (Not Found)` for audio files:**
  - Verify `config.public_file_server.enabled = true` in `later_augment_api/config/environments/development.rb`.
  - Ensure the `rails_storage` volume is correctly configured in `docker-compose.yml` and mounted to `/app/storage` for the `web` service.
  - Run `docker compose down -v` followed by `docker compose up --build` and `db:migrate` again to ensure a clean state, but be aware this will reset your database and saved files.
- **Google Cloud TTS API errors:**
  - Double-check your `GOOGLE_CLOUD_PROJECT` in `.env`.
  - Ensure the `google-credentials.json` file is correctly placed in `later_augment_api/` and contains valid service account keys.
  - Verify that the "Cloud Text-to-Speech API" is enabled in your Google Cloud project.
  - Check the Rails `web` service logs (`docker compose logs web`) for specific error messages from the Google Cloud client library.
- **Frontend build issues or blank page:**
  - Check `docker compose logs client` for any Vite or React errors.
  - Ensure `VITE_RAILS_API_URL` is set correctly in `.env` and points to your Rails backend.

---
