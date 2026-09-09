Rails.application.routes.draw do
  get "profile", to: "users#profile"

  get "search/regions", to: "search#regions", as: :search_regions
  get "search/prefectures", to: "search#prefectures", as: :search_prefectures

  get "search/areas", to: "search#areas", as: :search_areas
  get "search", to: "search#index", as: :search
  get "routes/calculate", to: "routes#calculate"
  devise_for :users, skip: [ :passwords ], controllers: {
    registrations: "users/registrations"
  }

  root "maps#index"
  # Define your application routes per the DSL in https://guides.rubyonrails.org/routing.html

  # Reveal health status on /up that returns 200 if the app boots with no exceptions, otherwise 500.
  # Can be used by load balancers and uptime monitors to verify that the app is live.
  get "up" => "rails/health#show", as: :rails_health_check

  # Render dynamic PWA files from app/views/pwa/*
  get "service-worker" => "rails/pwa#service_worker", as: :pwa_service_worker
  get "manifest" => "rails/pwa#manifest", as: :pwa_manifest
  get "terms", to: "static_pages#terms"
  get "privacy_policy", to: "static_pages#privacy_policy"
  # Defines the root path route ("/")
  # root "posts#index"
end
