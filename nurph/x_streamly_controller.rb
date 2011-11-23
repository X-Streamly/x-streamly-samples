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
      if(action.index('entered'))
        #to be pulled from your DB
        token  = '<from user data>'
        tokenSecret = '<from user data>'
        
        requestData = @client.generateRequestData(channel,@appKey,@appSecret,token,tokenSecret )
        key = @client.setTwitterStream(channel,'tweet',requestData)
        puts key
        render :text => 'SUCCESS'
      else
        puts '--'
        puts 'exit'
        render :text => 'exit'
      end
      
    else
      render :status => 400
    end
  end
  
  skip_before_filter :verify_authenticity_token
end