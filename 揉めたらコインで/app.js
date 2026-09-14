'use strict';
const flip=document.querySelector('#flip');
const label=document.querySelector('#button-label');
const result=document.querySelector('#result');
const poster=document.querySelector('#poster');
const notice=document.querySelector('#notice');
const canvas=document.querySelector('#animation');
const context=canvas.getContext('2d',{willReadFrequently:true});
const videos=[document.querySelector('#heads'),document.querySelector('#tails')];
let busy=false;
flip.addEventListener('click',async()=>{
  if(busy)return;
  busy=true;flip.disabled=true;label.textContent='運命を、待つ。';
  result.classList.remove('revealed');result.textContent='表 か、裏 か。';notice.textContent='';
  let side;
  try{side=crypto.getRandomValues(new Uint8Array(1))[0]&1;}catch{notice.textContent='抽選を開始できません。ページを再読み込みしてください。';busy=false;flip.disabled=false;label.textContent='コインを投げる';return;}
  const video=videos[side];
  videos.forEach(v=>{v.pause();v.classList.remove('active')});
  let finished=false,timer,raf;
  function draw(){
    if(finished)return;
    context.drawImage(video,0,0,540,540);
    const frame=context.getImageData(0,0,540,540);
    // Remove the MP4's black stage, preserving the opaque gold relief.
    for(let i=0;i<frame.data.length;i+=4){const brightness=Math.max(frame.data[i],frame.data[i+1],frame.data[i+2]);frame.data[i+3]=Math.min(255,Math.max(0,(brightness-8)*16));}
    context.putImageData(frame,0,0);raf=requestAnimationFrame(draw);
  }
  function finish(failed=false){
    if(finished)return;finished=true;clearTimeout(timer);cancelAnimationFrame(raf);canvas.classList.remove('active');
    video.removeEventListener('ended',ended);video.removeEventListener('error',error);video.pause();
    poster.src=side?'./assets/tails-poster.png':'./assets/heads-poster.png';
    poster.classList.remove('hidden');videos.forEach(v=>v.classList.remove('active'));
    result.classList.add('revealed');result.replaceChildren();
    const face=document.createElement('span');face.textContent=side?'裏':'表';
    const name=document.createElement('small');name.textContent=side?'月の紋章':'羅針盤の紋章';result.append(face,name);
    if(failed)notice.textContent='動画を再生できないため、抽選結果を表示しました。';
    busy=false;flip.disabled=false;label.textContent='もう一度、投げる';
  }
  const ended=()=>finish();const error=()=>finish(true);
  if(matchMedia('(prefers-reduced-motion: reduce)').matches){finish();return;}
  video.addEventListener('ended',ended,{once:true});video.addEventListener('error',error,{once:true});
  timer=setTimeout(()=>finish(true),15000);
  try{video.currentTime=0;await video.play();if(!finished){draw();canvas.classList.add('active');poster.classList.add('hidden');}}catch{finish(true);}
});
