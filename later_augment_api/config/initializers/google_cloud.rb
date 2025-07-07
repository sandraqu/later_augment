# later_augment_api/config/initializers/google_cloud.rb

# Configure Google Cloud client libraries
# This allows the client libraries to find your credentials
# when running inside the Docker container.
if ENV['GOOGLE_APPLICATION_CREDENTIALS_JSON_PATH'].present?
  ENV['GOOGLE_APPLICATION_CREDENTIALS'] = ENV['GOOGLE_APPLICATION_CREDENTIALS_JSON_PATH']
elsif ENV['RAILS_ENV'] == 'development' && File.exist?(Rails.root.join('config', 'google-credentials.json'))
  # For local development where credentials might be in config/
  ENV['GOOGLE_APPLICATION_CREDENTIALS'] = Rails.root.join('config', 'google-credentials.json').to_s
end

# Optionally, configure specific services if needed, e.g., Speech-to-Text
# Google::Cloud::Speech.configure do |config|
#   config.credentials = Rails.root.join('config', 'google-credentials.json') # Or set via ENV['GOOGLE_APPLICATION_CREDENTIALS']
# end