import { Server } from "remote-kakao";

const config = {
    email: ``,
    password: ``,
    key: ``,
    host: ``
};

namespace Kakao {
    export const server = new Server({useKakaoLink: true})
}

export default Kakao;