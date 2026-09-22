/* eslint-disable @next/next/no-img-element */
"use client"
import React from "react";
import {
  Button,
  TextField
} from "@mui/material";
import ArrowBackIosNewIcon from '@mui/icons-material/ArrowBackIosNew';
import { useRouter } from "next/navigation";

function ChatFeature() {
  
  const router = useRouter();

  return (
    <>
      <div className="chat_page">
        <div className="s_head flex hd_6">
          <h2><ArrowBackIosNewIcon onClick={() => router.push('/account/orders/detail/?mode=Ongoing')} /> Chat</h2>
          <div className="rt">
            <div className="btn_flex">
              <Button onClick={() => router.push('/account/help-center')}>Help</Button>
            </div>
          </div>
        </div>
        <div className="form chat_sc">
          <div className="chat_body">
            <div className="single_message sended">
              <div className="msg_body">
                <p>Hello Sir, I’m Waiting at pickup Location</p>
              </div>
            </div>
            <div className="single_message recieved">
              <figure className="image_user"><figcaption>AP</figcaption></figure>
              <div className="msg_body">
                <p>Hello, Okay I’m Waiting for order</p>
              </div>
            </div>
          </div>

          <div className="chat_foot">
            <div className="control_group">
              <TextField hiddenLabel placeholder="Write your message" fullWidth />
              <Button className="icon_btn">
                <img src="/images/send_icon.svg" alt="Send Icon" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default ChatFeature;
