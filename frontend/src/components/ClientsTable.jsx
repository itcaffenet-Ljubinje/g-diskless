import React,{useState,useEffect} from 'react'
import axios from 'axios'
axios.interceptors.request.use(cfg=>{ const t=localStorage.getItem('token'); if(t){ cfg.headers = cfg.headers || {}; cfg.headers['Authorization']='Bearer '+t } return cfg })
export default function ClientsTable(){
  const [clients,setClients]=useState([]); const [label,setLabel]=useState('')
  const fetchClients=()=>{} // clients are zvol clones; listing done via disks API in this simple UI
  const createClient=async ()=>{ if(!label) return alert('label required'); await axios.post('/api/clients/create',{label}); alert('created'); setLabel('') }
  const destroyClient=async (l)=>{ if(!confirm('Destroy '+l+'?')) return; await axios.post('/api/clients/destroy',{label:l}); alert('destroyed') }
  return (<div className='bg-white p-4 rounded shadow'><h2 className='font-semibold mb-2'>Clients</h2><div className='flex gap-2 mb-3'><input value={label} onChange={e=>setLabel(e.target.value)} placeholder='client-label e.g. pc-001122' className='border p-2'/><button onClick={createClient} className='bg-blue-600 text-white px-3 py-1 rounded'>Create Client</button></div><p className='text-sm text-gray-600'>Use Disk Manager to create base volume 'win11_base' and snapshot it as 'clean' before provisioning clients.</p></div>) }
