const express= require('express');
const router=express.Router();
router.get('/',(req, res)=> res.json({message:'perfil pendiente'}));
module.exports=router;