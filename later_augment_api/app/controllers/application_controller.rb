class ApplicationController < ActionController::API
    def hello; render json: { message: "Hello from Rails API!" }; end
end
