# app/controllers/api/v1/tts_controller.rb
class Api::V1::TtsController < ApplicationController
  # Before action to set client (good practice for reusability)
  before_action :set_google_tts_client

  # If you're not sending CSRF tokens from React for POST requests,
  # or using API tokens, you might temporarily skip it for development.
  # For production, properly handle CSRF or use token-based auth.
  # REMINDER: Since React is sending 'X-CSRF-Token', keep this commented out
  # unless you encounter specific CSRF issues that you've investigated.
  # skip_before_action :verify_authenticity_token


  # GET /api/v1/voices
  def voices_list
    response = @client.list_voices(language_code: params[:language_code])

    voices = response.voices.map do |voice|
      {
        name: voice.name,
        language_codes: voice.language_codes,
        ssml_gender: voice.ssml_gender,
        natural_sample_rate_hertz: voice.natural_sample_rate_hertz
        # Add other voice properties you might want to display or filter by
      }
    end
    render json: { voices: voices }
  rescue Google::Cloud::Error => e
    Rails.logger.error "Google Text-to-Speech API error (voices_list): #{e.message}"
    render json: { error: "Google Text-to-Speech API error: #{e.message}" }, status: :internal_server_error
  rescue StandardError => e
    Rails.logger.error "An unexpected error occurred (voices_list): #{e.message}"
    render json: { error: "An unexpected error occurred: #{e.message}" }, status: :internal_server_error
  end

  # POST /api/v1/preview_tts
  # Used specifically for voice previews
  def preview_tts
    text_to_synthesize = params[:text] || "This is a voice preview." # Ensure a default if text isn't sent
    language_code = params[:language_code] # Should come from frontend based on selected voice
    voice_name = params[:voice_name]
    speaking_rate = params[:speaking_rate].present? ? params[:speaking_rate].to_f : 1.0
    pitch = params[:pitch].present? ? params[:pitch].to_f : 0.0

    if text_to_synthesize.blank? || voice_name.blank? || language_code.blank?
      return render json: { error: "Text, voice name, and language code are required for preview." }, status: :bad_request
    end

    input_text = { text: text_to_synthesize }
    voice_params = {
      language_code: language_code,
      name: voice_name
    }
    audio_config = {
      audio_encoding: :MP3,
      speaking_rate: speaking_rate,
      pitch: pitch
    }

    begin
      response = @client.synthesize_speech(
        input: input_text,
        voice: voice_params,
        audio_config: audio_config
      )

      render json: { audioContent: Base64.strict_encode64(response.audio_content) }
    rescue Google::Cloud::Error => e
      Rails.logger.error "Google TTS Error (preview_tts): #{e.message}"
      render json: { error: "Google Text-to-Speech API error: #{e.message}" }, status: :internal_server_error
    rescue StandardError => e
      Rails.logger.error "Unexpected Error (preview_tts): #{e.message}"
      render json: { error: "An unexpected error occurred: #{e.message}" }, status: :internal_server_error
    end
  end

  # POST /api/v1/tts
  # For main TTS generation and saving the speech

def create
  text_to_synthesize = params[:text]
  language_code = params[:language_code]
  voice_name = params[:voice_name]
  speaking_rate = params[:speaking_rate].to_f # Ensure float conversion
  pitch = params[:pitch].to_f # Ensure float conversion

  # Basic validation for required parameters
  if text_to_synthesize.strip.start_with?('<speak>') && text_to_synthesize.strip.end_with?('</speak>')
    input_text = { ssml: text_to_synthesize }
  else
    input_text = { text: text_to_synthesize }
  end
  
  voice_params = { language_code: language_code, name: voice_name }
  audio_config = {
    audio_encoding: :MP3,
    speaking_rate: speaking_rate,
    pitch: pitch
  }

  begin
    # 1. Synthesize speech using Google Cloud Text-to-Speech
    tts_response = @client.synthesize_speech(
      input: input_text,
      voice: voice_params,
      audio_config: audio_config
    )

    # Check if audio content was returned
    unless tts_response.audio_content.present?
      Rails.logger.error "Google TTS returned no audio content for: #{text_to_synthesize}"
      return render json: { error: "Google Text-to-Speech API returned no audio content." }, status: :unprocessable_entity
    end

    # 2. Create a new Speech record
    speech = Speech.new(
      text: text_to_synthesize,
      voice_name: voice_name,
      speaking_rate: speaking_rate,
      pitch: pitch
      # Add any other relevant metadata you want to store in the Speech model
    )

    # 3. Attach the audio content using Active Storage
    # Use StringIO directly with the binary content for efficiency
    # This avoids creating a temporary file on disk just to immediately attach it.
    # THIS IS THE KEY CHANGE FROM YOUR VERSION:
    speech.audio_file.attach(
      io: StringIO.new(tts_response.audio_content), # Pass StringIO with binary content
      filename: "#{SecureRandom.hex(8)}.mp3",       # Generate a unique filename
      content_type: "audio/mpeg"                    # Specify content type
    )

    # 4. Save the Speech record to the database
    if speech.save
      # 5. Return a JSON response with the saved speech details, including the public audio URL
      render json: {
        id: speech.id,
        text: speech.text,
        audio_url: url_for(speech.audio_file), # Generate the public URL
        created_at: speech.created_at,
        voice_name: speech.voice_name,
        speaking_rate: speech.speaking_rate,
        pitch: speech.pitch
        # Include any other attributes you want the frontend to receive
      }, status: :created
    else
      # Handle validation errors if speech.save fails
      Rails.logger.error "Speech save failed: #{speech.errors.full_messages.to_sentence}"
      render json: { error: speech.errors.full_messages.to_sentence }, status: :unprocessable_entity
    end

  rescue Google::Cloud::Error => e
    Rails.logger.error "Google TTS Error (create): #{e.message}"
    render json: { error: "Google Text-to-Speech API error: #{e.message}" }, status: :internal_server_error
  rescue StandardError => e
    Rails.logger.error "Unexpected Error (create): #{e.message}"
    render json: { error: "An unexpected error occurred: #{e.message}" }, status: :internal_server_error
  end
end
  # GET /api/v1/speeches
  # List all saved speeches
  def index
    # Fetch all speeches, ordered by creation date (newest first)
    speeches = Speech.all.order(created_at: :desc)

    # Map speeches to a JSON format, including the audio URL
    render json: speeches.map { |speech|
      {
        id: speech.id,
        text: speech.text,
        # Ensure audio_file is attached before trying to get its URL
        audio_url: speech.audio_file.attached? ? url_for(speech.audio_file) : nil,
        created_at: speech.created_at,
        voice_name: speech.voice_name, # Include these if you added the columns
        speaking_rate: speech.speaking_rate,
        pitch: speech.pitch
      }
    }
  rescue StandardError => e
    Rails.logger.error "Error fetching speeches (index): #{e.message}"
    render json: { error: "An unexpected error occurred while fetching speeches: #{e.message}" }, status: :internal_server_error
  end

  # DELETE /api/v1/speeches/:id
  # Delete a specific speech record and its associated audio file
  def destroy
    speech = Speech.find_by(id: params[:id])

    if speech
      speech.destroy # Active Storage automatically deletes the attached file
      head :no_content # HTTP 204 No Content, indicating successful deletion
    else
      render json: { error: "Speech not found" }, status: :not_found # HTTP 404
    end
  rescue StandardError => e
    Rails.logger.error "Error deleting speech (destroy): #{e.message}"
    render json: { error: "An unexpected error occurred while deleting speech: #{e.message}" }, status: :internal_server_error
  end

  private

  def set_google_tts_client
    @client = Google::Cloud::TextToSpeech.text_to_speech
  end
end