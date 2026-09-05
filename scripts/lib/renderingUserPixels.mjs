import {inflateSync} from 'node:zlib'
export function decodeAuditPng(bytes){
 let at=8,width,height,channels;const chunks=[]
 while(at+12<=bytes.length){const n=bytes.readUInt32BE(at),type=bytes.toString('ascii',at+4,at+8),data=bytes.subarray(at+8,at+8+n);if(type==='IHDR'){width=data.readUInt32BE(0);height=data.readUInt32BE(4);if(data[8]!==8||![2,6].includes(data[9])||data[12]!==0)throw Error('Unsupported screenshot PNG');channels=data[9]===6?4:3}if(type==='IDAT')chunks.push(data);at+=12+n;if(type==='IEND')break}
 if(!width||!height||width*height>16777216)throw Error('Screenshot dimensions exceed audit bounds')
 const raw=inflateSync(Buffer.concat(chunks)),stride=width*channels,reconstructed=Buffer.alloc(height*stride),rgba=Buffer.alloc(width*height*4)
 const paeth=(a,b,c)=>{const p=a+b-c,pa=Math.abs(p-a),pb=Math.abs(p-b),pc=Math.abs(p-c);return pa<=pb&&pa<=pc?a:pb<=pc?b:c}
 for(let y=0;y<height;y++){const filter=raw[y*(stride+1)];for(let x=0;x<stride;x++){const value=raw[y*(stride+1)+1+x],left=x>=channels?reconstructed[y*stride+x-channels]:0,above=y?reconstructed[(y-1)*stride+x]:0,diagonal=y&&x>=channels?reconstructed[(y-1)*stride+x-channels]:0;reconstructed[y*stride+x]=(value+(filter===0?0:filter===1?left:filter===2?above:filter===3?Math.floor((left+above)/2):filter===4?paeth(left,above,diagonal):(()=>{throw Error('Invalid PNG filter')})()))&255}}
 for(let i=0;i<width*height;i++){rgba[i*4]=reconstructed[i*channels];rgba[i*4+1]=reconstructed[i*channels+1];rgba[i*4+2]=reconstructed[i*channels+2];rgba[i*4+3]=channels===4?reconstructed[i*channels+3]:255}
 return{width,height,rgba}
}
export function auditPixel(image,x,y){const start=(Math.max(0,Math.min(image.height-1,Math.round(y)))*image.width+Math.max(0,Math.min(image.width-1,Math.round(x))))*4;return [...image.rgba.subarray(start,start+4)]}
