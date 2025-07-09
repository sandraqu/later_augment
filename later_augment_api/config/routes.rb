Rails.application.routes.draw do
  get "up" => "rails/health#show", as: :rails_health_check
   
  # Top-level routes for TTS functionality
  get 'voices', to: 'api/v1/tts#voices_list'
  get 'speeches', to: 'api/v1/tts#index'

  # API namespace for versioning
  namespace :api do
    namespace :v1 do
      # TTS endpoint: receives text, returns audio
      post 'tts', to: 'tts#create'
      get 'speeches', to: 'tts#index'
      delete 'speeches/:id', to: 'tts#destroy'

      get 'voices', to: 'tts#voices_list'
      post 'preview_tts', to: 'tts#preview_tts'

      get 'csrf_token', to: 'base#csrf_token'
    end
  end
end
