const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const dotenv = require("dotenv");

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// Conectar a MongoDB
mongoose
  .connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log("✅ Conectado a MongoDB"))
  .catch((err) => console.error("Error al conectar MongoDB:", err));

// Modelo de Tarea
const TaskSchema = new mongoose.Schema({
  text: String,
  completed: Boolean,
});
const Task = mongoose.model("tasks", TaskSchema);

// Rutas de la API
app.get("/tasks", async (req, res) => {
  const tasks = await Task.find();
  res.json(tasks);
});

// Actualizar tarea (Marcar como completada o no)
app.put("/tasks/:id", async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) {
      return res.status(404).json({ message: "Tarea no encontrada" });
    }

    task.completed = !task.completed; // Alternar entre completado y no completado
    await task.save();
    res.json(task);
  } catch (error) {
    res.status(500).json({ message: "Error al actualizar tarea" });
  }
});

app.post("/tasks", async (req, res) => {
  try {
    const newTask = new Task({ text: req.body.text, completed: false });
    const savedTask = await newTask.save();
    res.status(201).json({
      message: "Tarea agregada con éxito",
      task: savedTask // 🚀 Enviamos el objeto completo
    });
  } catch (error) {
    res.status(500).json({ message: "Error al agregar tarea" });
  }
});

app.delete("/tasks/:id", async (req, res) => {
  await Task.findByIdAndDelete(req.params.id);
  res.json({ message: "Tarea eliminada" });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Servidor en http://localhost:${PORT}`));