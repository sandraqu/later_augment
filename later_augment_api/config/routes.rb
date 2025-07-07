Rails.application.routes.draw do
  # Define your application routes per the DSL in https://guides.rubyonrails.org/routing.html
  # Reveal health status on /up that returns 200 if the app boots with no exceptions, otherwise 500.
  # Can be used by load balancers and uptime monitors to verify that the app is live.
  get "up" => "rails/health#show", as: :rails_health_check
  # get '/hello', to: 'application#hello'
   # Health check route

  # API namespace for versioning
  namespace :api do
    namespace :v1 do
      # TTS endpoint: receives text, returns audio
      post 'tts', to: 'tts#create'
      get 'speeches', to: 'tts#index' # Route to list all saved speeches
      delete 'speeches/:id', to: 'tts#destroy' # Route to delete a specific speech by ID
    end
  end

  # Top-level route for /speeches
  get 'speeches', to: 'api/v1/tts#index'

  # Defines the root path route ("/")
  # root "posts#index"
end
