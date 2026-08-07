const SCALE = 5;
const state = { secret: sessionStorage.getItem("designerSecret") || "", template: null, versions: [], selected: null, dragging: null };
const $ = (id) => document.getElementById(id);
const api = async (url, options = {}) => {
  const response = await fetch(url, { ...options, headers: { "content-type": "application/json", "x-designer-secret": state.secret, ...(options.headers || {}) } });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || `Request failed (${response.status})`);
  return data;
};
const sample = (element) => element.type === "text" ? element.text : element.type === "createdTime" ? "07-08-2026" : element.type === "recordId" ? "recExample" : element.type === "combined" ? element.fields.join(element.separator || " ") : element.field;
const clamp = (n, min, max) => Math.max(min, Math.min(max, n));

function render() {
  const canvas = $("label");
  canvas.style.width = `${state.template.widthMm * SCALE}px`;
  canvas.style.height = `${state.template.heightMm * SCALE}px`;
  canvas.replaceChildren();
  for (const element of state.template.elements) {
    const node = document.createElement("div");
    node.className = `element${element.id === state.selected ? " selected" : ""}`;
    node.dataset.id = element.id;
    Object.assign(node.style, { left:`${element.x*SCALE}px`, top:`${element.y*SCALE}px`, width:`${element.width*SCALE}px`, height:`${element.height*SCALE}px`, border:element.border===false?"1px dashed #b8bfb9":"1px solid #222" });
    const caption = document.createElement("span"); caption.className="caption"; caption.textContent=element.label || "";
    const value = document.createElement("span"); value.className="sample"; value.textContent=sample(element); value.style.fontSize=`${element.fontSize}px`; value.style.fontWeight=element.bold===false?"400":"700"; value.style.whiteSpace=element.wrap?"normal":"nowrap";
    node.append(caption,value);
    node.addEventListener("pointerdown", (event) => startDrag(event, element));
    node.addEventListener("click", () => select(element.id));
    canvas.append(node);
  }
  $("width").value=state.template.widthMm; $("height").value=state.template.heightMm;
  renderInspector(); renderVersions();
}

function select(id){state.selected=id;render()}
function selected(){return state.template.elements.find((item)=>item.id===state.selected)}
function startDrag(event, element){
  event.preventDefault(); select(element.id);
  state.dragging={element,startX:event.clientX,startY:event.clientY,x:element.x,y:element.y};
}
window.addEventListener("pointermove",(e)=>{if(!state.dragging)return;const d=state.dragging;d.element.x=clamp(d.x+(e.clientX-d.startX)/SCALE,0,state.template.widthMm-d.element.width);d.element.y=clamp(d.y+(e.clientY-d.startY)/SCALE,0,state.template.heightMm-d.element.height);render()});
window.addEventListener("pointerup",()=>{state.dragging=null});
function renderInspector(){
  const element=selected(); $("emptyInspector").hidden=!!element; $("inspector").hidden=!element;if(!element)return;
  $("propLabel").value=element.label||""; $("propText").value=element.text||""; $("textRow").hidden=element.type!=="text";
  for(const [id,key] of [["propX","x"],["propY","y"],["propWidth","width"],["propHeight","height"],["propFont","fontSize"]]) $(id).value=element[key];
  $("propBold").checked=element.bold!==false; $("propWrap").checked=!!element.wrap; $("propBorder").checked=element.border!==false;
}
function renderVersions(){
  const holder=$("versions");holder.replaceChildren();
  for(const item of state.versions){const button=document.createElement("button");button.className="version";button.innerHTML=`<span>Version ${item.version}</span><span>${item.widthMm}×${item.heightMm}</span>`;button.onclick=()=>restore(item.version);holder.append(button)}
}
function addElement(field, type="field"){
  const id=`el-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  state.template.elements.push({id,type,field,label:type==="text"?"TEXT":field.toUpperCase(),text:type==="text"?"New text":undefined,x:4,y:4,width:26,height:10,fontSize:9,bold:true,border:true});select(id);
}
async function load(){
  const [{fields},data]=await Promise.all([api("/api/designer/fields"),api("/api/designer/template")]);
  state.template=data.template;state.versions=data.versions;
  $("fields").replaceChildren(...fields.map((field)=>{const node=document.createElement("div");node.className="field";node.textContent=field;node.draggable=true;node.ondragstart=(e)=>e.dataTransfer.setData("text/plain",field);return node}));
  $("status").textContent=`Published version ${state.template.version || "built-in"}`;render();
}
async function save(){const data=await api("/api/designer/template",{method:"PUT",body:JSON.stringify(state.template)});state.template=data.template;state.versions=data.versions;$("status").textContent=`Published version ${state.template.version}`;render()}
async function restore(version){if(!confirm(`Restore version ${version} as a new published version?`))return;const data=await api("/api/designer/template",{method:"POST",body:JSON.stringify({version})});state.template=data.template;state.versions=data.versions;render()}

$("label").ondragover=(e)=>e.preventDefault();$("label").ondrop=(e)=>{e.preventDefault();const field=e.dataTransfer.getData("text/plain");if(!field)return;addElement(field);const el=selected();const rect=$("label").getBoundingClientRect();el.x=clamp((e.clientX-rect.left)/SCALE,0,state.template.widthMm-el.width);el.y=clamp((e.clientY-rect.top)/SCALE,0,state.template.heightMm-el.height);render()};
$("addText").onclick=()=>addElement("", "text");$("save").onclick=()=>save().catch((e)=>alert(e.message));
$("remove").onclick=()=>{state.template.elements=state.template.elements.filter((e)=>e.id!==state.selected);state.selected=null;render()};
$("duplicate").onclick=()=>{const item=selected();if(!item)return;const copy={...item,id:`el-${Date.now()}`,x:item.x+2,y:item.y+2};state.template.elements.push(copy);select(copy.id)};
for(const [id,key] of [["propLabel","label"],["propText","text"],["propX","x"],["propY","y"],["propWidth","width"],["propHeight","height"],["propFont","fontSize"]]) $(id).oninput=(e)=>{const item=selected();item[key]=e.target.type==="number"?Number(e.target.value):e.target.value;render()};
for(const [id,key,invert] of [["propBold","bold",false],["propWrap","wrap",false],["propBorder","border",false]]) $(id).onchange=(e)=>{selected()[key]=invert?!e.target.checked:e.target.checked;render()};
for(const [id,key] of [["width","widthMm"],["height","heightMm"]]) $(id).onchange=(e)=>{state.template[key]=Number(e.target.value);render()};
$("unlock").onclick=async(e)=>{e.preventDefault();state.secret=$("secret").value;try{await load();sessionStorage.setItem("designerSecret",state.secret);$("login").close()}catch(error){$("loginError").textContent=error.message}};
if(state.secret)load().catch(()=>$("login").showModal());else $("login").showModal();
