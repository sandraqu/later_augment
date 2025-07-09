class AddTtsDetailsToSpeeches < ActiveRecord::Migration[7.1]
  def change
    add_column :speeches, :voice_name, :string
    add_column :speeches, :speaking_rate, :float
    add_column :speeches, :pitch, :float
  end
end
