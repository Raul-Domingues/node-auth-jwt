import dotenv from 'dotenv';
import express from 'express';
import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { User } from './models/User.js';


const app = express();
app.use(express.json())

dotenv.config();


app.get('/', (req, res) => {
    res.status(200).json({message: "Bem-vindo a nossa API!"})
})

app.get('/user/:id', checkToken, async (req, res) => {
    const id = req.params.id

    const user = await User.findById(id, '-password')

    if(!user) {
        return res.status(404).json({msg: "Usuario não encontrado"})
    }

    res.status(200).json({ user })
})

function checkToken(req, res, next) {
    const authHeader = req.headers['authorization']
    const token = authHeader && authHeader.split(" ")[1]

    if(!token) {
        return res.status(401).json({msg: "Acesso negado!"})
    }

    try {
        const secret = process.env.SECRET

        jwt.verify(token, secret)

        next()
    } catch (error) {
        res.status(400).json({msg: "Token inválido!"})
    }
}

app.post('/auth/register', async(req, res) => {
    const {name, email, password, confirmpassword} = req.body

    if(!name) {
        return res.status(422).json({msg: "O nome é obrigatório"})
    }

    if(!email) {
        return res.status(422).json({msg: "O email é obrigatório"})
    }

    if(!password) {
        return res.status(422).json({msg: "A senha é obrigatório"})
    }

    if(password !== confirmpassword) {
        return res.status(422).json({msg: "As senhas não conferem"})
    }

    const userExists = await User.findOne({ email: email})

    if(userExists) {
        return res.status(422).json({msg: "Por favor, utilize outro e-mail"})
    }

    const salt = await bcrypt.genSalt(12)
    const passwordHash = await bcrypt.hash(password, salt)

    const user = new User({
        name,
        email,
        password: passwordHash,
    })

    try {
        await user.save()
        res.status(201).json({msg: "Usuario criado com sucesso!"})
    } catch (error) {
        console.log(error)
        res.status(500).json({msg: "Aconteceu um erro no sevridor, tente novamente mais tarde!"})
    }

})

app.post('/auth/login', async (req, res) => {
    const { email, password } = req.body;

    if(!email) {
        return res.status(422).json({msg: "O email é obrigatório"})
    }

    if(!password) {
        return res.status(422).json({msg: "A senha é obrigatório"})
    }

    const user = await User.findOne({ email: email})

    if(!user) {
        return res.status(422).json({msg: "Usuário não encontrado!"})
    }

    const checkPassword = await bcrypt.compare(password, user.password)

    if(!checkPassword) {
        return res.status(422).json({msg: "Senha inválida!"})
    }

    try {
        const secret = process.env.SECRET
        const token = jwt.sign({
            id: user._id,
        }, secret)

        res.status(200).json({msg: "Autenticação realizada com sucesso!", token})
    } catch (error) {
        console.log(error)
        res.status(500).json({msg: "Aconteceu um erro no sevridor, tente novamente mais tarde!"})
    }
})

const dbUser = process.env.DB_USER
const dbPassword = process.env.DB_PASS

mongoose.connect(`mongodb+srv://${dbUser}:${dbPassword}@cluster0.ogo0u.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`).then(() => {
    app.listen(3000)
    console.log('Conectou ao banco')
}).catch((err) => console.log(err))

