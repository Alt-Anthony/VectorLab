const express= require ('express');
const router= express.Router();
router.post('/register',(req, res)=> res.json({message:'register pendiente'}));
router.post('/login',(req,res)=>res.json({message:'login pendiente'}));
router.post('/logout', (req, res)=> res.json({message:'logout pendiente'}));

module.exports=router;