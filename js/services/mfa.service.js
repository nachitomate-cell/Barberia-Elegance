// ═══════════════════════════════════════════════════════════════════
//  MFA SERVICE — helpers para 2FA con TOTP (Google Authenticator,
//  1Password, Authy, etc.). Firebase Auth compat 10.x.
//
//  REQUISITOS:
//    · Firebase Auth debe tener MFA habilitado en Firebase Console
//      → Authentication → Sign-in method → Multi-factor authentication.
//    · TOTP no requiere costos por SMS (a diferencia del MFA por SMS).
//    · Todas las cuentas afectadas deben tener email verificado.
//
//  USO TÍPICO:
//    · Enrolamiento (una vez por user):
//        const s = await MFA.iniciarEnrolamientoTotp(currentUser);
//        // Mostrar s.otpauthUrl en un QR y s.secret como fallback texto.
//        await MFA.completarEnrolamientoTotp(currentUser, s, codigoOTP);
//
//    · Login con MFA:
//        try { await auth.signInWithEmailAndPassword(email, pass); }
//        catch (err) {
//          if (err.code === 'auth/multi-factor-auth-required') {
//            const info = MFA.abrirResolver(err);
//            // Pedirle el código de 6 dígitos al user y llamar:
//            await MFA.resolverConCodigo(info, codigoOTP);
//          }
//        }
//
//    · Chequear si un user tiene MFA:
//        MFA.tieneMfa(user) === true|false
// ═══════════════════════════════════════════════════════════════════

(function () {
  'use strict';

  const NOMBRE_APP = 'SynapTech';

  function _mfa(user) {
    return firebase.auth().multiFactor(user);
  }

  /**
   * Inicia el enrolamiento TOTP: genera un secret y devuelve la URL
   * otpauth:// para renderizar el QR (compatible con Google
   * Authenticator, 1Password, Authy, Microsoft Authenticator, etc.).
   *
   * El usuario debe tener email verificado. Si no lo tiene, Firebase
   * lanza auth/unverified-email al llamar getSession().
   */
  async function iniciarEnrolamientoTotp(user) {
    const session = await _mfa(user).getSession();
    const secret = await firebase.auth.TotpMultiFactorGenerator
      .generateSecret(session);
    const email = user.email || 'user';
    const otpauthUrl = secret.generateQrCodeUrl(email, NOMBRE_APP);
    return {
      secret,             // objeto opaco; se re-usa en el paso siguiente
      otpauthUrl,         // otpauth://totp/... para renderizar como QR
      textoFallback:      secret.secretKey, // por si no puede escanear
    };
  }

  /**
   * Completa el enrolamiento: se llama con el código de 6 dígitos que
   * el user copió de su authenticator app. Al terminar, MFA queda
   * activa y en el próximo login Firebase pedirá el segundo factor.
   */
  async function completarEnrolamientoTotp(user, enrolInfo, codigoOtp) {
    const assertion = firebase.auth.TotpMultiFactorGenerator
      .assertionForEnrollment(enrolInfo.secret, String(codigoOtp).trim());
    await _mfa(user).enroll(assertion, 'Authenticator App');
  }

  /**
   * Devuelve un objeto con la info necesaria para resolver un desafío
   * MFA que Firebase lanzó al hacer signIn. El caller debe pedirle al
   * user el código y llamar resolverConCodigo().
   */
  function abrirResolver(errorMfa) {
    const resolver = firebase.auth().getMultiFactorResolver(errorMfa);
    // Tomamos el primer hint TOTP (soportamos solo TOTP por ahora).
    const totpHint = (resolver.hints || []).find(
      h => h.factorId === firebase.auth.TotpMultiFactorGenerator.FACTOR_ID
    );
    if (!totpHint) {
      throw new Error('Solo se soporta TOTP como segundo factor.');
    }
    return { resolver, hint: totpHint };
  }

  async function resolverConCodigo(info, codigoOtp) {
    const assertion = firebase.auth.TotpMultiFactorGenerator
      .assertionForSignIn(info.hint.uid, String(codigoOtp).trim());
    return info.resolver.resolveSignIn(assertion);
  }

  /**
   * true si el user tiene al menos un segundo factor enrolado.
   * Útil para mostrar banners "activa tu 2FA" a admins/jefes que aún
   * no lo hicieron.
   */
  function tieneMfa(user) {
    try {
      return !!user && (user.multiFactor?.enrolledFactors || []).length > 0;
    } catch (_) { return false; }
  }

  /**
   * Política de MFA obligatorio por rol. Por ahora TODOS los admins y
   * jefes deben tenerla; barberos y clientes finales no.
   */
  function esObligatoria(rol) {
    return rol === 'admin' || rol === 'jefe';
  }

  window.MFA = {
    iniciarEnrolamientoTotp,
    completarEnrolamientoTotp,
    abrirResolver,
    resolverConCodigo,
    tieneMfa,
    esObligatoria,
  };
})();
