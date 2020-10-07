const request = require('supertest');
const nock = require('nock');

const { app } = require('../../../build/app');
const { createSession } = require('./helpers');
const { COMMANDS, ELEMENT } = require('../../build/constants/constants');

describe('Get Computed Label', () => {
    it('returns the computed label', async () => {
        
        nock(/plumadriver\.com/)
        .get('/')
        .reply(200, `<body>${testScript}</body>`);

        const sessionId = await createSession(request, app);
        await request(app)
            .post(`/session/${sessionId}/url`)
            .send({
                url: 'http://plumadriver.com',
            })
            .expect(200);
        
            const {
                body: { value },
            } = request(app)
                .get(`/session/${sessionId}/element/${elementId}/computedlabel`)
                .expect(200);
    })
})