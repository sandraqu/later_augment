# later_augment_api/config/initializers/google_cloud.rb

# Configure Google Cloud client libraries to find your credentials
if ENV['GOOGLE_APPLICATION_CREDENTIALS_JSON_PATH'].present?
  ENV['GOOGLE_APPLICATION_CREDENTIALS'] = ENV['GOOGLE_APPLICATION_CREDENTIALS_JSON_PATH']
elsif ENV['RAILS_ENV'] == 'development' && File.exist?(Rails.root.join('config', 'google-credentials.json'))
  # For local development where credentials might be in config/
  ENV['GOOGLE_APPLICATION_CREDENTIALS'] = Rails.root.join('config', 'google-credentials.json').to_s
end

# Initialize the Google Cloud Text-to-Speech client and make it available
# throughout the application via Rails.application.config.google_tts_client
Rails.application.config.google_tts_client = Google::Cloud::TextToSpeech.text_to_speech

# Optionally, you can configure other specific Google Cloud services here as well
# if you need them later, for example:
# Rails.application.config.google_speech_to_text_client = Google::Cloud::Speech.speech
# Rails.application.config.google_natural_language_client = Google::Cloud::Language.language