class Speech < ApplicationRecord
  validates :text, presence: true, length: { minimum: 1 }
  has_one_attached :audio_file # Add this line
end