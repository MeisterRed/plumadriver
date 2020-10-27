import express from 'express';
import Pluma from '../Types/types';
import { updateDate } from '../time';

const timeouts = (express.Router() as unknown) as Pluma.SessionRouter;

timeouts.get('/', (req, res) => {
  updateDate();
  const response = { value: req.session.getTimeouts() };
  res.json(response);
});

// set timeouts
timeouts.post('/', (req, res) => {
  updateDate();
  req.session.setTimeouts(req.body);
  res.send({ value: null });
});

export default timeouts;
