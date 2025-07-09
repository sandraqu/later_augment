class RemoveAudioUrlFromSpeeches < ActiveRecord::Migration[7.1]
  def change
        remove_column :speeches, :audio_url, :string
  end
end
