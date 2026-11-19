const verifyPasskey = (req, res) => {
  const provided = typeof req.body?.passkey === 'string' ? req.body.passkey : '';
  const expected = process.env.ROSTER_PASSKEY || '';

  if (!expected || provided !== expected) {
    return res.status(401).json({ message: 'Incorrect passkey.' });
  }

  return res.json({ ok: true });
};

export default verifyPasskey;
