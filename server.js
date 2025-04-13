const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => {
  console.log("Connexion réussie à MongoDB Atlas !");
}).catch(err => {
  console.error("Erreur de connexion à MongoDB Atlas :", err);
});




// Reservation
const ReservationSchema = new mongoose.Schema({
  id : String,
  nom: String,
  prenom: String,
  nomArtiste: String,
  nomEvenement: String,
  photo: String, // Nous stockerons l'URL de la photo
  isValidated: Boolean,
});

const Reservation = mongoose.model('Reservation', ReservationSchema);

app.post('/api/reservations', async (req, res) => {
  try {
    console.log('Données reçues:', req.body);
    delete req.body._id;
    const reservation = new Reservation(req.body);
    await reservation.save();
    res.status(201).json(reservation);
  } catch (error) {
    console.error('Erreur lors de la création de la réservation:', error);
    res.status(400).json({ message: error.message });
  }
});

app.get('/api/reservations', async (req, res) => {
  try {
    const reservations = await Reservation.find();
    res.json(reservations);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.put('/api/reservations/:id', async (req, res) => {
  try {
    const reservation = await Reservation.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    if (!reservation) {
      return res.status(404).json({ message: 'Réservation non trouvée' });
    }
    res.json(reservation);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

app.delete('/api/reservations/:id', async (req, res) => {
  try {
    const id = req.params.id;
    console.log(`Tentative de suppression de la réservation avec ID : ${id}`);
    const result = await Reservation.findByIdAndDelete(id);
    
    if (!result) {
      console.log(`Aucune réservation trouvée avec l'ID : ${id}`);
      return res.status(404).json({ message: 'Réservation non trouvée' });
    }
    
    console.log(`Réservation avec l'ID : ${id} supprimée avec succès`);
    res.json({ message: 'Réservation supprimée avec succès' });
  } catch (error) {
    console.error('Erreur lors de la suppression de la réservation:', error);
    res.status(500).json({ message: 'Erreur lors de la suppression de la réservation' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});



// Authentication
const UserSchema = new mongoose.Schema({
    identifiant: { type: String, unique: true, required: true },
    motDePasse: { type: String, required: true },
  });
  
  const User = mongoose.model('User', UserSchema);

  const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

app.post('/api/inscription', async (req, res) => {
  try {
    const { identifiant, motDePasse } = req.body;
    const motDePasseHash = await bcrypt.hash(motDePasse, 10);
    const user = new User({ identifiant, motDePasse: motDePasseHash });
    await user.save();
    res.status(201).json({ message: 'Utilisateur créé avec succès' });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

app.post('/api/connexion', async (req, res) => {
  try {
    const { identifiant, motDePasse } = req.body;
    const user = await User.findOne({ identifiant });
    if (!user) {
      return res.status(400).json({ message: 'Utilisateur non trouvé' });
    }
    const isValid = await bcrypt.compare(motDePasse, user.motDePasse);
    if (!isValid) {
      return res.status(400).json({ message: 'Mot de passe incorrect' });
    }
    const token = jwt.sign({ userId: user._id }, 'votre_secret_jwt');
    res.json({ token });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

app.post('/api/reset-password', async (req, res) => {
try {
const { email } = req.body;
const user = await User.findOne({ email });
if (!user) {
return res.status(404).json({ message: 'Utilisateur non trouvé' });
}

// Générez un code de réinitialisation à 6 chiffres
const resetCode = Math.floor(100000 + Math.random() * 900000).toString();
user.resetPasswordCode = resetCode;
user.resetPasswordExpires = Date.now() + 3600000; // 1 heure
await user.save();

// Envoyez l'email
const mailOptions = {
to: user.email,
from: 'noreply@votre-app.com',
subject: 'Code de réinitialisation du mot de passe',
text: `Votre code de réinitialisation du mot de passe est : ${resetCode}\n\n
Ce code expirera dans 1 heure.\n\n
Si vous n'avez pas demandé cette réinitialisation, veuillez ignorer cet email.\n`,
};

await transporter.sendMail(mailOptions);
res.json({ message: 'Un code de réinitialisation a été envoyé par email' });
} catch (error) {
res.status(500).json({ message: error.message });
}
});

// Nouvelle route pour vérifier le code et réinitialiser le mot de passe
app.post('/api/reset-password-confirm', async (req, res) => {
try {
const { email, code, newPassword } = req.body;
const user = await User.findOne({ 
email, 
resetPasswordCode: code,
resetPasswordExpires: { $gt: Date.now() }
});

if (!user) {
return res.status(400).json({ message: 'Code invalide ou expiré' });
}

// Réinitialiser le mot de passe
user.password = await bcrypt.hash(newPassword, 10);
user.resetPasswordCode = undefined;
user.resetPasswordExpires = undefined;
await user.save();

res.json({ message: 'Mot de passe réinitialisé avec succès' });
} catch (error) {
res.status(500).json({ message: error.message });
}
});

//middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Une erreur est survenue sur le serveur' });
});