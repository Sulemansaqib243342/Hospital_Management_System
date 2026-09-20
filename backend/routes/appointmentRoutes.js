const express = require('express');
const router = express.Router();
const protect = require('../middleware/auth');
const ctrl = require('../controllers/appointmentController');

router.get('/', protect, ctrl.getAllAppointments);
router.get('/today', protect, ctrl.getTodayAppointments);
router.post('/', protect, ctrl.createAppointment);
router.put('/:id/status', protect, ctrl.updateAppointmentStatus);
router.post('/:id/attend', protect, ctrl.attendPatient);
router.delete('/:id', protect, ctrl.deleteAppointment);

module.exports = router;
