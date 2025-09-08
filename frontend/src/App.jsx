import React from 'react'
import Dashboard from './components/Dashboard'
import Login from './components/Login';
import React, {useState} from 'react'
export default function App(){ const [token,setToken]=useState(localStorage.getItem('token')); if(!token) return (<div className='p-6'><Login onLogin={(t)=>setToken(t)}/></div>); return (<div className='p-6 font-sans'><h1 className='text-2xl font-bold mb-4'>ggRock Replica</h1><Dashboard/></div>) }
