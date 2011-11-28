class TwitterStreams < ActiveRecord::Base
  validates :user,  :presence => true
  validates :topic, :presence => true
  validates :streamKey, :presence => true
end