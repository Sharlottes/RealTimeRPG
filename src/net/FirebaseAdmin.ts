import firebase, { auth } from "firebase-admin"

import { Account } from "../auth"

import config from "../publicKey.json";
import secret from "../sdk.json"

class FirebaseAdmin {
    public readonly app: firebase.app.App;
    public readonly database: firebase.database.Database;
    public readonly firestore: firebase.firestore.Firestore;
    public readonly auth: auth.Auth;

    public readonly accounts: Map<string, Account>;

    public constructor() {
        const setup: firebase.AppOptions = {
            ...config,
            credential: firebase.credential.cert({
                projectId: secret.project_id,
                privateKey: secret.private_key,
                clientEmail: secret.client_email
            })
        }

        const app = this.app = firebase.initializeApp(setup);

        const database = this.database = firebase.database(this.app);
        const auth = this.auth = firebase.auth(this.app);
        const firestore = this.firestore = firebase.firestore(this.app);

        const accounts = this.accounts = new Map<string, Account>();

        database.goOnline();
    }
}

const admin = new FirebaseAdmin();

export default admin;