import { getCurrentDriverSession } from "../../services/authApi.js";

const session = await getCurrentDriverSession();

window.location.replace(session ? "./home/" : "./login/");
