import * as THREE from 'three';

function paper(draw,width=1024,height=1280){
  const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;
  const ctx=canvas.getContext('2d');ctx.fillStyle='#f8f5ed';ctx.fillRect(0,0,width,height);draw(ctx,width,height);
  const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;return texture;
}
function wrap(ctx,text,x,y,width,lineHeight){let line='';for(const char of text){if(ctx.measureText(line+char).width>width){ctx.fillText(line,x,y);y+=lineHeight;line='';}line+=char;}ctx.fillText(line,x,y);}
function surface(texture,width,depth,y,up=true){
  const mesh=new THREE.Mesh(new THREE.PlaneGeometry(width,depth),new THREE.MeshStandardMaterial({map:texture,roughness:.92,metalness:0,emissive:0xffffff,emissiveMap:texture,emissiveIntensity:.12}));
  mesh.rotation.x=up?-Math.PI/2:Math.PI/2;mesh.position.y=y;mesh.receiveShadow=true;return mesh;
}
function box(w,h,d,material,x=0,y=0,z=0){const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),material);mesh.position.set(x,y,z);mesh.castShadow=true;mesh.receiveShadow=true;return mesh;}
function outline(parent,width,depth,y){
  const group=new THREE.Group(),material=new THREE.MeshBasicMaterial({color:new THREE.Color().setRGB(0,.4,3.2),toneMapped:false});
  for(const [x,z,w,d] of [[-width/2,0,.008,depth],[width/2,0,.008,depth],[0,-depth/2,width,.008],[0,depth/2,width,.008]])group.add(box(w,.002,d,material,x,y,z));
  parent.add(group);return {group,material};
}
export function createDeskObjects(content,portrait,upperFloor){
  const leather=new THREE.MeshStandardMaterial({color:0x222832,roughness:.56}),pages=new THREE.MeshStandardMaterial({color:0xf5efde,roughness:.94});
  const book=new THREE.Group();book.name='Interactive_Profile_Book';book.position.set(-3.70,.912,-2.0);
  book.add(box(.62,.014,.70,leather,0,.009));
  book.add(box(.586,.049,.666,pages,0,.04));
  for(let i=0;i<6;i++)book.add(box(.588,.001,.668,new THREE.MeshStandardMaterial({color:0xd5cebf,roughness:1}),0,.020+i*.007));
  const inside=paper(ctx=>{
    ctx.fillStyle='#78715f';ctx.font='25px sans-serif';ctx.fillText('01  /  ABOUT THE DESIGNER',75,100);
    const s=Math.min(300/portrait.width,365/portrait.height);ctx.drawImage(portrait,75,170,portrait.width*s,portrait.height*s);
    ctx.fillStyle='#222831';ctx.font='bold 55px sans-serif';ctx.fillText('이건규',75,640);ctx.font='29px sans-serif';ctx.fillText(content.profile.role,75,710);
    ctx.font='30px sans-serif';wrap(ctx,content.profile.introduction,75,810,860,49);
    ctx.font='23px sans-serif';ctx.fillText('LEE GEON-GYU / PROFILE',75,1190);
  });
  book.add(surface(inside,.574,.654,.066));
  const hinge=new THREE.Group();hinge.position.set(-.31,.074,0);book.add(hinge);
  hinge.add(box(.62,.014,.70,leather,.31));
  const cover=paper(ctx=>{ctx.fillStyle='#202630';ctx.fillRect(0,0,1024,1280);ctx.strokeStyle='#bbac8e';ctx.lineWidth=2;ctx.strokeRect(65,65,894,1150);ctx.fillStyle='#e9deca';ctx.font='25px sans-serif';ctx.fillText('AFTERNOON ATELIER',95,160);ctx.font='78px Georgia,serif';ctx.fillText('Profile',95,660);ctx.font='30px sans-serif';ctx.fillText('LEE GEON-GYU',95,1100);});
  const outside=surface(cover,.608,.688,.0075);outside.position.x=.31;hinge.add(outside);
  const insideCover=paper(ctx=>{ctx.fillStyle='#222831';ctx.font='54px Georgia,serif';ctx.fillText('A little',75,210);ctx.fillText('about me.',75,285);ctx.font='29px sans-serif';wrap(ctx,content.profile.introduction,75,410,850,51);ctx.font='24px sans-serif';ctx.fillText('DESIGN · EXPERIENCE · PUBLISHING',75,1120);});
  const leftPage=surface(insideCover,.608,.688,-.0075,false);leftPage.position.x=.31;hinge.add(leftPage);
  const bookCue=outline(hinge,.63,.71,.010);bookCue.group.position.x=.31;
  const card=new THREE.Group();card.name='Interactive_Contact_Card';card.position.set(-2.8,upperFloor+.846,-1.45);card.rotation.y=.08;
  card.add(box(.44,.006,.27,pages));
  const cardPrint=paper((ctx,w,h)=>{ctx.fillStyle='#202630';ctx.fillRect(0,0,24,h);ctx.font='bold 69px sans-serif';ctx.fillText('이건규',80,160);ctx.font='27px sans-serif';ctx.fillStyle='#686c72';ctx.fillText('UI/UX DESIGNER & WEB PUBLISHER',80,215);ctx.strokeStyle='#bbb9b2';ctx.beginPath();ctx.moveTo(80,280);ctx.lineTo(940,280);ctx.stroke();ctx.fillStyle='#202630';ctx.font='33px sans-serif';ctx.fillText(content.profile.email,80,365);ctx.fillText(content.profile.phone,80,420);ctx.font='25px sans-serif';ctx.fillText('LEE GEON-GYU / AFTERNOON ATELIER',80,535);},1024,628);
  card.add(surface(cardPrint,.434,.264,.0032));
  const cardCue=outline(card,.452,.282,.004);
  const entries=[{id:'profile',kind:'book',root:book,floor:0,focus:new THREE.Vector3(-.31,.07,0),hinge,cue:bookCue},{id:'contact',kind:'card',root:card,floor:upperFloor,focus:new THREE.Vector3(0,0,0),cue:cardCue}];
  for(const entry of entries){entry.meshes=[];entry.root.traverse(mesh=>{if(mesh.isMesh&&mesh.material!==entry.cue.material){mesh.userData.contentId=entry.id;entry.meshes.push(mesh);}});}
  return entries;
}
