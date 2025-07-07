# later_augment_api/app/controllers/api/v1/tts_controller.rb

require "google/cloud/text_to_speech"

module Api
  module V1
    class TtsController < ApplicationController
      # GET /api/v1/speeches
      def index
        speeches = Speech.order(created_at: :desc)
        render json: speeches.map { |s| s.attributes.except("updated_at") }
      rescue StandardError => e
        Rails.logger.error "Error fetching speeches: #{e.message}"
        render json: { error: "An unexpected error occurred while fetching speeches: #{e.message}" }, status: :internal_server_error
      end

      # POST /api/v1/tts
      def create
        text_input = params[:text]

        if text_input.blank?
          render json: { error: "Text parameter is required." }, status: :bad_request and return
        end

        speech = Speech.new(text: text_input)
        unless speech.save
          render json: { error: "Failed to save speech text: #{speech.errors.full_messages.join(', ')}" }, status: :unprocessable_entity and return
        end

        client = Google::Cloud::TextToSpeech.text_to_speech

        synthesis_input = { text: text_input }
        voice = {
          language_code: "en-US",
          name: "en-US-Wavenet-D",
          ssml_gender: :NEUTRAL
        }
        audio_config = { audio_encoding: :MP3 }

        response = client.synthesize_speech(input: synthesis_input, voice: voice, audio_config: audio_config)

        send_data response.audio_content,
                  type: 'audio/mpeg',
                  disposition: 'inline',
                  filename: 'speech.mp3'

      rescue Google::Cloud::Error => e
        Rails.logger.error "Google TTS API Error: #{e.message}"
        render json: { error: "Failed to synthesize speech: #{e.message}" }, status: :internal_server_error
      rescue StandardError => e
        Rails.logger.error "An unexpected error occurred: #{e.message}"
        render json: { error: "An unexpected error occurred: #{e.message}" }, status: :internal_server_error
      end

      # --- NEW ACTION STARTS HERE ---
      # DELETE /api/v1/speeches/:id
      def destroy
        speech = Speech.find_by(id: params[:id])
        if speech
          speech.destroy
          head :no_content # Send a 204 No Content status for successful deletion
        else
          render json: { error: "Speech not found." }, status: :not_found
        end
      rescue StandardError => e
        Rails.logger.error "Error deleting speech: #{e.message}"
        render json: { error: "An unexpected error occurred while deleting speech: #{e.message}" }, status: :internal_server_error
      end
      # --- NEW ACTION ENDS HERE ---
    end
  end
end