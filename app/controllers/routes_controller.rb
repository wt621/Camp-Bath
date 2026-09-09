class RoutesController < ApplicationController
  skip_before_action :authenticate_user!, only: :calculate

  def calculate
    origin_lat = params[:origin_lat]
    origin_lng = params[:origin_lng]
    destination_lat = params[:destination_lat]
    destination_lng = params[:destination_lng]

    if [
      origin_lat,
      origin_lng,
      destination_lat,
      destination_lng
    ].any?(&:blank?)
      render json: {
        error: "出発地または目的地の位置情報がありません"
      }, status: :bad_request

      return
    end

    response = Faraday.post(
      "https://routes.googleapis.com/directions/v2:computeRoutes"
    ) do |request|
      request.headers["Content-Type"] = "application/json"
      request.headers["X-Goog-Api-Key"] =
        ENV.fetch("GOOGLE_ROUTES_API_KEY")
      request.headers["X-Goog-FieldMask"] =
        "routes.duration,routes.distanceMeters"

      request.body = {
        origin: {
          location: {
            latLng: {
              latitude: origin_lat.to_f,
              longitude: origin_lng.to_f
            }
          }
        },

        destination: {
          location: {
            latLng: {
              latitude: destination_lat.to_f,
              longitude: destination_lng.to_f
            }
          }
        },

        travelMode: "DRIVE",
        routingPreference: "TRAFFIC_AWARE"
      }.to_json
    end

    unless response.success?
      Rails.logger.error(
        "Routes API error: #{response.status} #{response.body}"
      )

      render json: {
        error: "ルート情報を取得できませんでした"
      }, status: :bad_gateway

      return
    end

    data = JSON.parse(response.body)
    route = data["routes"]&.first

    if route.blank?
      render json: {
        error: "ルートが見つかりませんでした"
      }, status: :not_found

      return
    end

    render json: {
      distance_meters: route["distanceMeters"],
      duration: route["duration"]
    }
  rescue KeyError
    render json: {
      error: "Routes APIの設定がありません"
    }, status: :internal_server_error
  rescue StandardError => e
    Rails.logger.error(
      "Routes API request failed: #{e.message}"
    )

    render json: {
      error: "ルート情報の取得に失敗しました"
    }, status: :internal_server_error
  end
end
