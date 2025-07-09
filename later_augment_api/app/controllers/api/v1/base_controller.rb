# app/controllers/api/v1/base_controller.rb
class Api::V1::BaseController < ApplicationController
  # skip_before_action :verify_authenticity_token # Might need this if CSRF token isn't in headers for this specific endpoint

  def csrf_token
    render json: { csrf_token: form_authenticity_token }
  end
end