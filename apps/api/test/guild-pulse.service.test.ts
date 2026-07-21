import assert from 'node:assert/strict';
import { test } from 'node:test';
import { BadRequestException, ValidationPipe } from '@nestjs/common';
import { GuildPulseModerationStatus, GuildPulseParticipationStatus, GuildPulseStatus } from '@prisma/client';
import { SubmitGuildPulseDto } from '../src/modules/guild-pulse/dto';
import { GuildPulseService } from '../src/modules/guild-pulse/guild-pulse.service';
const pipe = new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true });
test('pulse DTO bounds all five voluntary dimensions from 1 to 5', async () => {
  const valid={belonging:5,clarity:4,workload:3,fun:5,helpSafety:4,openText:'Comentario opcional.'};
  await pipe.transform(valid,{type:'body',metatype:SubmitGuildPulseDto});
  await assert.rejects(()=>pipe.transform({...valid,belonging:6},{type:'body',metatype:SubmitGuildPulseDto}),BadRequestException);
});
test('anonymous response contains no player identity and participation is stored separately',async()=>{
  let responseData:any; let participationData:any;
  const cycle={id:'cycle-1',status:GuildPulseStatus.OPEN,opensAt:new Date(Date.now()-1000),closesAt:new Date(Date.now()+10000),openTextDays:30,minGroupSize:5};
  const prisma={player:{findFirst:async()=>({id:'player-1'})},guildPulseCycle:{findFirst:async()=>cycle},guildPulseParticipation:{findUnique:async()=>null},$transaction:async(cb:any)=>cb({guildPulseResponse:{create:async({data}:any)=>{responseData=data;}},guildPulseParticipation:{upsert:async({create}:any)=>{participationData=create;}}})};
  const service=new GuildPulseService(prisma as never,{} as never);
  await service.submit('user-1','cycle-1',{belonging:4,clarity:4,workload:3,fun:5,helpSafety:4,openText:'Seguro.'});
  assert.equal(responseData.playerId,undefined); assert.equal(responseData.moderationStatus,GuildPulseModerationStatus.PENDING); assert.equal(participationData.playerId,'player-1');
});
test('Staff aggregate and open text stay blocked below minimum anonymous group',async()=>{
  const cycle={id:'cycle-1',minGroupSize:5};
  const prisma={guildPulseResponse:{updateMany:async()=>({count:0}),count:async()=>4},guildPulseCycle:{findMany:async()=>[cycle]},guildPulseParticipation:{groupBy:async()=>[{status:GuildPulseParticipationStatus.SUBMITTED,_count:{_all:4}}]}};
  const service=new GuildPulseService(prisma as never,{} as never); const result=await service.getStaffWorkspace() as any;
  assert.equal(result.cycles[0].aggregationAvailable,false); assert.equal(result.cycles[0].averages,null); assert.deepEqual(result.cycles[0].openTexts,[]); assert.equal(result.individualScoresExposed,false);
});
test('expired open text is erased while numeric anonymous response remains',async()=>{
  let data:any; const prisma={guildPulseResponse:{updateMany:async(args:any)=>{data=args.data;return{count:2};}}}; const service=new GuildPulseService(prisma as never,{} as never);
  const result=await service.cleanupExpiredOpenText(); assert.equal(result.count,2); assert.equal(data.openText,null); assert.equal(data.moderationStatus,GuildPulseModerationStatus.HIDDEN);
});
