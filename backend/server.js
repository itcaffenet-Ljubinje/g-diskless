        import express from 'express';
        import bodyParser from 'body-parser';
        import cors from 'cors';
        import { exec } from 'child_process';
        import fs from 'fs';
        const app = express();
        app.use(cors());
        app.use(bodyParser.json());

import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
const JWT_SECRET = process.env.JWT_SECRET || 'replace_this_secret';
const USERS_FILE = '/etc/ggrock-replica/users.json';

// helper to load/save users
function loadUsers(){ try{ return JSON.parse(fs.readFileSync(USERS_FILE,'utf8')); }catch(e){ return {users:[{username:'admin',password:'$2a$10$u1N9ZzWq8JtY9rK8j9v2fuK5yJ8Jp9Q7Fv1e9Yb5G6b2a1c3d4e5}]} } }
function saveUsers(obj){ fs.writeFileSync(USERS_FILE, JSON.stringify(obj,null,2)); }

function authMiddleware(req,res,next){
  const auth = req.headers.authorization;
  if(!auth) return res.status(401).json({error:'missing authorization'});
  const parts = auth.split(' ');
  if(parts.length!==2) return res.status(401).json({error:'bad auth'});
  const token = parts[1];
  try{ const decoded = jwt.verify(token, JWT_SECRET); req.user = decoded; return next(); }catch(e){ return res.status(401).json({error:'invalid token'}); }
}
// create default users file if missing
if(!fs.existsSync(USERS_FILE)){
  const pw = bcrypt.hashSync('adminpass',10);
  saveUsers({users:[{username:'admin',password:pw}]});
  try{ fs.chownSync(USERS_FILE, 0, 0); }catch(e){}
}

        const STORAGE_BASE = '/srv/ggrock';
        // Simple health
        app.get('/api/health', (req,res)=>res.json({status:'ok'}));
        // List ZFS volumes (disks)
        app.get('/api/disks', (req,res)=>{
          exec("zfs list -H -o name,volsize -r vg1 || true", (err,stdout,stderr)=>{
            if(err) return res.status(500).json({err: stderr||err.message});
            const lines = stdout.trim().split('\n').filter(Boolean).map(l=>{const [n,s]=l.split('\t');return {name:n,size:s}});
            res.json(lines);
          });
        });
        // Create disk (ZFS zvol)
        app.post('/api/disks/create', authMiddleware, (req,res)=>{
          const { name, size } = req.body || {};
          if(!name || !size) return res.status(400).send('name and size required');
          exec(`zfs create -V ${size}G vg1/${name}`, (err,stdout,stderr)=>{
            if(err) return res.status(500).json({err: stderr||err.message});
            res.json({ok:true, name, size});
          });
        });
        // Create client clone (calls script)
        app.post('/api/clients/create', authMiddleware, (req,res)=>{
          const { label } = req.body || {};
          if(!label) return res.status(400).send('label required');
          exec(`/usr/local/bin/create_client_clone.sh ${label}`, (err,stdout,stderr)=>{
            if(err) return res.status(500).json({err: stderr||err.message});
            res.json({ok:true, out: stdout});
          });
        });
        // Destroy client clone
        app.post('/api/clients/destroy', authMiddleware, (req,res)=>{
          const { label } = req.body || {};
          if(!label) return res.status(400).send('label required');
          // compute tid same as script and delete target and zfs dataset
          const client = label;
          const cmd = `python3 - <<'PY'
import sys,subprocess
c='''${client}'''
sum=0
for ch in c:
    sum+=ord(ch)
TID=100+sum%800
import os
os.system(f"tgtadm --lld iscsi --op delete --mode target --tid {TID} || true")
os.system(f"zfs destroy vg1/{client} || true")
print('done')
PY`;
          exec(cmd, (err,stdout,stderr)=>{
            if(err) return res.status(500).json({err: stderr||err.message});
            res.json({ok:true, out: stdout});
          });
        });
        // Snapshot and rollback
        app.post('/api/snapshot', authMiddleware, (req,res)=>{
          const { dataset, snap } = req.body || {};
          if(!dataset || !snap) return res.status(400).send('dataset and snap required');
          exec(`zfs snapshot ${dataset}@${snap}`, (err,stdout,stderr)=>{
            if(err) return res.status(500).json({err: stderr||err.message});
            res.json({ok:true});
          });
        });
        app.post('/api/rollback', authMiddleware, (req,res)=>{
          const { dataset, snap } = req.body || {};
          if(!dataset || !snap) return res.status(400).send('dataset and snap required');
          exec(`zfs rollback -r ${dataset}@${snap}`, (err,stdout,stderr)=>{
            if(err) return res.status(500).json({err: stderr||err.message});
            res.json({ok:true});
          });
        });
        // serve static frontend files if present
        app.use(express.static('/var/www/html'));
        // Authentication endpoints
app.post('/api/auth/login', (req,res)=>{
  const { username, password } = req.body || {};
  const users = loadUsers().users || [];
  const u = users.find(x=>x.username===username);
  if(!u) return res.status(401).json({error:'invalid credentials'});
  if(!bcrypt.compareSync(password, u.password)) return res.status(401).json({error:'invalid credentials'});
  const token = jwt.sign({username:u.username}, JWT_SECRET, {expiresIn:'8h'});
  res.json({token});
});

app.post('/api/auth/change-password', authMiddleware, (req,res)=>{
  const { username, newPassword } = req.body || {};
  if(!username || !newPassword) return res.status(400).json({error:'missing'});
  const usersObj = loadUsers();
  const idx = usersObj.users.findIndex(x=>x.username===username);
  if(idx===-1) return res.status(404).json({error:'not found'});
  usersObj.users[idx].password = bcrypt.hashSync(newPassword,10);
  saveUsers(usersObj);
  res.json({ok:true});
});

const PORT = process.env.PORT || 3000;
        app.listen(PORT, ()=>console.log(`ggrock-replica backend listening on ${PORT}`));
