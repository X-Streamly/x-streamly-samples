require 'xstreamly'

class XStreamlyController < ApplicationController
  def initialize
    @client = XStreamly::Client.new('appkey','email','password');
    @secret = 'adfasfasdfadfasdfasdfasdf'
    @appKey = '<from twitter config>'
    @appSecret='<from twitter config>'
  end

  def registerCallback
    if(@client.setCallback('<ChannelName>','<EndPoint>',@secret,'event'))
      render :text => 'SUCCESS'
      return
    end
    render :text => 'FAIL'
  end
  
  def callback
    if(@secret== params[:Secret])
      parsed_json = ActiveSupport::JSON.decode(params[:Data][:Message])
      action = parsed_json['content']
      channel =params[:Data][:Channel]
      user = parsed_json['generated_by']['display_name']
      if(action.index('entered'))
        #to be pulled from your DB
        token  = '<from user data>'
        tokenSecret = '<from user data>'
        
        oldUser = TwitterStreams.find_by_user_and_topic(user,channel)
        if (oldUser)
          puts 'removing old user'
          oldUser.destroy()
          @client.removeTwitterStream(oldUser.streamKey)
        end
          
        
        requestData = @client.generateRequestData('#' +channel,@appKey,@appSecret,token,tokenSecret )
        key = @client.setTwitterStream(channel,'tweet',requestData)
        puts 'key:' +key
        stream = TwitterStreams.new
        stream.user = user
        stream.topic = channel
        stream.streamKey = key
        stream.save
        render :text => 'SUCCESS ENTER'
      else
        puts 'removing user'
        stream = TwitterStreams.find_by_user_and_topic(user,channel)
        if(!stream.nil?)
			puts 'got user: "'+stream.streamKey+'"'
			@client.removeTwitterStream(stream.streamKey)
			stream.destroy
		end
        render :text => 'SUCCESS EXIT'
      end
      
    else
      render :status => 400
    end
  end
  
  skip_before_filter :verify_authenticity_token
end