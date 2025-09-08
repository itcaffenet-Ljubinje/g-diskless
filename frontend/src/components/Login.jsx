import React, {useState} from 'react';
import axios from 'axios';
export default function Login({onLogin}){
  const [user,setUser]=useState('admin'); const [pass,setPass]=useState('adminpass');
  const login=async()=>{
    const r=await axios.post('/api/auth/login',{username:user,password:pass});
    localStorage.setItem('token', r.data.token);
    onLogin(r.data.token);
  };
  return (<div className='bg-white p-4 rounded shadow mb-4'><h3 className='font-semibold mb-2'>Login</h3><div className='flex gap-2 mb-2'><input value={user} onChange={e=>setUser(e.target.value)} className='border p-2' /><input value={pass} onChange={e=>setPass(e.target.value)} type='password' className='border p-2' /></div><button onClick={login} className='bg-blue-600 text-white px-3 py-1 rounded'>Login</button></div>)
}
