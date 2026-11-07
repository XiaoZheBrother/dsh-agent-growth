// Model-authored curiosity is data, never executable code or permission.
const short=(value,max,label)=>{
  if(typeof value!=='string'||!value.trim()||value.length>max) throw new Error(`Invalid exploration ${label}`)
  return value
}
export function validateExploration(value) {
  const v=typeof value==='string'?JSON.parse(value):value
  if(!v||!Array.isArray(v.interests)||v.interests.length>3) throw new Error('Exploration needs 0..3 interests')
  const interests=v.interests.map(i=>{
    const result={id:short(i.id,80,'interest id'),question:short(i.question,300,'question'),
      why:short(i.why,500,'why'),status:short(i.status,30,'status')}
    if(i.ownership!=null) {
      const o=i.ownership
      if(!['self','partner','viewer','other','unknown'].includes(o.owner))throw Error('Invalid goal owner')
      result.ownership={owner:o.owner,basis:short(o.basis,800,'ownership basis'),
        personalReason:short(o.personalReason,800,'personal reason')}
    }
    return result
  })
  if(new Set(interests.map(i=>i.id)).size!==interests.length||interests.some(i=>!['active','paused','resolved'].includes(i.status))) throw new Error('Invalid interest states')
  if(!v.share||!['hold','candidate'].includes(v.share.decision)) throw new Error('Invalid share decision')
  let request=null
  if(v.request!=null) {
    const r=v.request
    if(!['search','inspect'].includes(r.kind)) throw new Error('Only read-only search/inspect requests supported')
    request={kind:r.kind,target:short(r.target,120,'target'),reason:short(r.reason,500,'request reason')}
  }
  let attention
  if(interests.some(i=>i.ownership)&&v.attention==null)throw Error('Goal ownership requires an attention decision')
  if(v.attention!=null) {
    const a=v.attention
    if(!['continue','wait','end'].includes(a.decision))throw Error('Invalid attention decision')
    if(a.revisitAt!=null && (a.decision!=='wait'||typeof a.revisitAt!=='string'||!/^\d{4}-\d\d-\d\dT.*(?:Z|[+-]\d\d:\d\d)$/.test(a.revisitAt)||!Number.isFinite(Date.parse(a.revisitAt))))throw Error('Invalid revisit time')
    if(a.decision!=='continue'&&request)throw Error('Closed attention cannot dispatch an observation')
    attention={decision:a.decision,reason:short(a.reason,1200,'attention reason'),revisitAt:a.revisitAt??null}
  }
  return {interests,surprise:short(v.surprise,1500,'surprise'),beliefChange:short(v.beliefChange,1500,'beliefChange'),
    nextExperiment:short(v.nextExperiment,1500,'nextExperiment'),share:{decision:v.share.decision,reason:short(v.share.reason,1000,'share reason')},request,...(attention?{attention}:{})}
}

export const EXPLORATION_INSTRUCTION=`本轮是探索，不要求交视频稿。你自己选择是否延续此前的兴趣（保持其 id），也可以暂停、解决或换问题，最多保留三个。不必围绕账号运营或工具修复；不要为了显得有趣硬编情绪、经历、矛盾或结论。
先读来源和前次探索，区分：真实观察、原先猜测、仍未知。视频标题/简介/评论不等于看过视频。保留具体意外、没成功的尝试和改变看法的原因；没有发现就直说。提出一个结果尚未确定的小实验，说明怎样知道它有收获；本轮没有执行权限的实验仅作为提案。
可申请下一次只读 search（target 为普通搜索词）或 inspect（target 为来源中已有的资料标识）；它只是请求，执行回执到达前不得声称已经做过。不需要继续查时 request=null。不得申请发布、评论、点赞、安装或权限修改。
用 growth_save 保存你自己的简短笔记，并提供 exploration JSON 字符串：{"interests":[{"id":"稳定短标识","question":"自己想追的问题","why":"为何在意","status":"active/paused/resolved"}],"surprise":"具体意外或暂无","beliefChange":"看法变化及依据或尚未改变","nextExperiment":"小实验提案与观察办法或暂不继续","share":{"decision":"hold 或 candidate","reason":"陌生观众为何会在意；证据不足时不发"},"request":null 或 {"kind":"search 或 inspect","target":"搜索词或已有资料标识","reason":"想消除什么疑问"}}。
candidate 只是值得讨论的素材，不是发布许可；没值得分享的经历就 hold，不强迫每天发片。旧兴趣与旧结果不覆盖。
每个兴趣增加 ownership:{owner:"self/partner/viewer/other/unknown",basis:"谁提出、依据是什么；未知就说明",personalReason:"你是否也想关注及原因，不想也可以"}。别人的建议不自动变成你的愿望。持续关注同一件事沿用 id，改变归属或想法解释原因。
增加 attention:{decision:"continue/wait/end",reason:"你为何继续、等待或结束",revisitAt:null或带时区的ISO时间}。这决定后续是否继续探索，不规定语气、句式或结束台词。wait 可以自己选复查时间，或留 null 等真实新素材；end 表示这轮关注已收尾，不因换天重开。新素材或明确继续的决定只触发重新考虑，不要求恢复旧兴趣。wait/end 时 request 必须为 null；结束不必升华、不必再起新题，也不要求发表告别。`
