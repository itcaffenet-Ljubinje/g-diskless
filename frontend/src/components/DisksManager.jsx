import React, {useState, useEffect} from 'react'
import axios from 'axios'
axios.interceptors.request.use(cfg=>{ const t=localStorage.getItem('token'); if(t){ cfg.headers = cfg.headers || {}; cfg.headers['Authorization']='Bearer '+t } return cfg })
export default function DisksManager(){
  const [disks,setDisks]=useState([]); const [name,setName]=useState(''); const [size,setSize]=useState('')
  const fetchDisks=async()=>{ const r=await axios.get('/api/disks'); setDisks(r.data) }
  useEffect(()=>{ fetchDisks() },[])
  const createDisk=async()=>{ await axios.post('/api/disks/create',{name,size}); setName(''); setSize(''); fetchDisks() }
  return (<div className='bg-white p-4 rounded shadow mb-4'><h2 className='font-semibold mb-2'>Disk Manager</h2><div className='flex gap-2 mb-3'><input value={name} onChange={e=>setName(e.target.value)} placeholder='disk-name' className='border p-2'/><input value={size} onChange={e=>setSize(e.target.value)} placeholder='size (GB)' className='border p-2'/><button onClick={createDisk} className='bg-green-600 text-white px-3 py-1 rounded'>Create</button></div><table className='w-full text-sm'><thead><tr><th>Name</th><th>Size</th></tr></thead><tbody>{disks.map(d=>(<tr key={d.name}><td className='border px-2 py-1'>{d.name}</td><td className='border px-2 py-1'>{d.size}</td></tr>))}</tbody></table></div>) }
