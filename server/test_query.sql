
SELECT 
  a.id as appointment_id,
  a.patient_id,
  a.dentist_id,
  a.scheduled_date,
  a.status as appointment_status,
  c.id as consultation_id,
  c.appointment_id as consultation_appointment_id
FROM appointments a
LEFT JOIN consultations c ON (a.id = c.appointment_id AND c.company_id = a.company_id)
WHERE a.company_id = 4 
  AND a.status != 'cancelado'
ORDER BY a.scheduled_date DESC;

