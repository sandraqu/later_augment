class CreateSpeeches < ActiveRecord::Migration[7.1]
  def change
    create_table :speeches do |t|
      t.text :text
      t.string :audio_url

      t.timestamps
    end
  end
end
