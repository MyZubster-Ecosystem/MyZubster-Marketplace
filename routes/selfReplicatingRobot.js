/**
 * EVA IONI - Self-Replicating Robot System
 * Robot che si costruiscono da soli con pagamenti in MYZ/XMR
 */

const express = require('express');
const router = express.Router();
const RobotTemplate = require('../models/RobotTemplate');
const RobotInstance = require('../models/RobotInstance');
const RobotAssembly = require('../models/RobotAssembly');

// ============================================================
// REGISTRA UN TEMPLATE DI ROBOT
// ============================================================

router.post('/template', async (req, res) => {
  try {
    const { 
      name, 
      type, 
      description, 
      components, 
      assemblyInstructions,
      costMYZ,
      costXMR,
      capabilities,
      imageUrl
    } = req.body;

    if (!name || !type || !components) {
      return res.status(400).json({ error: 'name, type and components are required' });
    }

    const template = new RobotTemplate({
      name,
      type,
      description: description || '',
      components: components || [],
      assemblyInstructions: assemblyInstructions || [],
      costMYZ: costMYZ || 100,
      costXMR: costXMR || 0.01,
      capabilities: capabilities || [],
      imageUrl: imageUrl || '',
      createdAt: new Date(),
      updatedAt: new Date()
    });

    await template.save();

    res.json({
      success: true,
      message: 'Robot template registered successfully',
      data: template
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// AVVIA LA COSTRUZIONE DI UN ROBOT
// ============================================================

router.post('/build', async (req, res) => {
  try {
    const { 
      templateId, 
      quantity = 1,
      wallet,
      partsSource = 'storage' 
    } = req.body;

    if (!templateId) {
      return res.status(400).json({ error: 'templateId is required' });
    }

    const template = await RobotTemplate.findById(templateId);
    if (!template) {
      return res.status(404).json({ error: 'Template not found' });
    }

    // Verifica che i componenti siano disponibili
    const partsCheck = await checkPartsAvailability(template.components, quantity);
    if (!partsCheck.available) {
      return res.status(400).json({ 
        error: 'Not enough parts available',
        missing: partsCheck.missing,
        required: partsCheck.required
      });
    }

    // Crea un lavoro di assemblaggio
    const assembly = new RobotAssembly({
      templateId: template._id,
      quantity: quantity,
      status: 'pending',
      partsSource: partsSource,
      wallet: wallet || '',
      startedAt: new Date(),
      estimatedCompletion: new Date(Date.now() + 2 * 60 * 60 * 1000) // 2 ore
    });

    await assembly.save();

    // Simula il processo di assemblaggio
    startAssemblyProcess(assembly._id);

    res.json({
      success: true,
      message: 'Robot assembly started',
      data: {
        assemblyId: assembly._id,
        template: template.name,
        quantity: quantity,
        estimatedCompletion: assembly.estimatedCompletion,
        status: 'pending'
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// STATO DELL'ASSEMBLAGGIO
// ============================================================

router.get('/assembly/:id', async (req, res) => {
  try {
    const assembly = await RobotAssembly.findById(req.params.id)
      .populate('templateId');

    if (!assembly) {
      return res.status(404).json({ error: 'Assembly not found' });
    }

    res.json({
      success: true,
      data: assembly
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// LISTA ROBOT COSTRUITI
// ============================================================

router.get('/instances', async (req, res) => {
  try {
    const { status, type, limit = 100 } = req.query;
    
    let query = {};
    if (status) query.status = status;
    if (type) query.type = type;
    
    const instances = await RobotInstance.find(query)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .populate('templateId');

    res.json({
      success: true,
      data: instances,
      count: instances.length
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// CLONA UN ROBOT (AUTO-REPLICAZIONE)
// ============================================================

router.post('/clone/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { quantity = 1, improvements = {} } = req.body;

    const sourceRobot = await RobotInstance.findById(id);
    if (!sourceRobot) {
      return res.status(404).json({ error: 'Robot not found' });
    }

    // Calcola il costo della clonazione
    const cloneCost = calculateCloneCost(sourceRobot, quantity, improvements);

    // Verifica fondi
    const fundsCheck = await checkFunds(cloneCost);
    if (!fundsCheck.available) {
      return res.status(400).json({ 
        error: 'Insufficient funds for cloning',
        required: cloneCost,
        available: fundsCheck.balance
      });
    }

    // Crea i nuovi robot
    const clones = [];
    for (let i = 0; i < quantity; i++) {
      const clone = new RobotInstance({
        templateId: sourceRobot.templateId,
        name: `${sourceRobot.name} Clone #${i + 1}`,
        type: sourceRobot.type,
        status: 'building',
        capabilities: [...sourceRobot.capabilities],
        improvements: improvements,
        createdAt: new Date(),
        builtFrom: sourceRobot._id,
        generation: (sourceRobot.generation || 0) + 1
      });
      await clone.save();
      clones.push(clone);
    }

    // Registra l'evento di clonazione
    await logCloneEvent(sourceRobot, clones, cloneCost);

    res.json({
      success: true,
      message: `Cloning started: ${quantity} robots being built`,
      data: {
        sourceRobot: sourceRobot._id,
        clones: clones.map(c => c._id),
        generation: (sourceRobot.generation || 0) + 1,
        quantity: quantity,
        cost: cloneCost
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// STATISTICHE ROBOT
// ============================================================

router.get('/stats', async (req, res) => {
  try {
    const total = await RobotInstance.countDocuments();
    const byStatus = await RobotInstance.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);
    const byType = await RobotInstance.aggregate([
      { $group: { _id: '$type', count: { $sum: 1 } } }
    ]);
    const avgGeneration = await RobotInstance.aggregate([
      { $group: { _id: null, avg: { $avg: '$generation' } } }
    ]);

    const templates = await RobotTemplate.countDocuments();
    const assemblies = await RobotAssembly.countDocuments({ status: { $ne: 'completed' } });

    res.json({
      success: true,
      data: {
        total,
        byStatus,
        byType,
        avgGeneration: avgGeneration[0]?.avg || 0,
        templates,
        activeAssemblies: assemblies,
        totalMYZSpent: await getTotalMYZSpent(),
        totalXMRSpent: await getTotalXMRSpent()
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// FUNZIONI DI SUPPORTO
// ============================================================

async function checkPartsAvailability(components, quantity) {
  // Simula il controllo dei componenti
  // In produzione, verifica il magazzino reale
  return {
    available: true,
    missing: [],
    required: components.map(c => ({
      ...c,
      needed: c.quantity * quantity
    }))
  };
}

async function checkFunds(cost) {
  // Simula il controllo dei fondi
  // In produzione, verifica il wallet reale
  return {
    available: true,
    balance: 1000 // MYZ
  };
}

function calculateCloneCost(sourceRobot, quantity, improvements) {
  const baseCost = 100; // MYZ
  let cost = baseCost * quantity;
  
  // Aggiungi costo per miglioramenti
  if (improvements && Object.keys(improvements).length > 0) {
    cost += 50 * quantity;
  }
  
  return cost;
}

async function logCloneEvent(sourceRobot, clones, cost) {
  // Registra l'evento di clonazione nel log
  console.log(`🔄 Robot cloned: ${sourceRobot._id} -> ${clones.length} new robots`);
  console.log(`💰 Cost: ${cost} MYZ`);
}

async function startAssemblyProcess(assemblyId) {
  // Simula il processo di assemblaggio
  setTimeout(async () => {
    try {
      const assembly = await RobotAssembly.findById(assemblyId);
      if (!assembly) return;
      
      assembly.status = 'in_progress';
      assembly.progress = 50;
      await assembly.save();
      
      setTimeout(async () => {
        const assembly = await RobotAssembly.findById(assemblyId);
        if (!assembly) return;
        
        assembly.status = 'completed';
        assembly.progress = 100;
        assembly.completedAt = new Date();
        await assembly.save();
        
        // Crea le istanze dei robot completati
        const template = await RobotTemplate.findById(assembly.templateId);
        for (let i = 0; i < assembly.quantity; i++) {
          const robot = new RobotInstance({
            templateId: template._id,
            name: `${template.name} #${i + 1}`,
            type: template.type,
            status: 'active',
            capabilities: template.capabilities,
            createdAt: new Date(),
            generation: 1
          });
          await robot.save();
        }
        
        console.log(`✅ Assembly ${assemblyId} completed: ${assembly.quantity} robots built`);
      }, 5000); // 5 secondi
      
    } catch (error) {
      console.error('❌ Assembly error:', error);
    }
  }, 5000); // 5 secondi
}

async function getTotalMYZSpent() {
  // Simula il totale MYZ speso
  return 1250; // MYZ
}

async function getTotalXMRSpent() {
  // Simula il totale XMR speso
  return 0.05; // XMR
}

module.exports = router;
