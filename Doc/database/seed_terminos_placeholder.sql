-- Columnas nuevas para "Datos legales" (editable en Tienda en línea → Footer)
alter table config_storefront add column if not exists razon_social text default '';
alter table config_storefront add column if not exists jurisdiccion text default '';

-- Texto de Términos y condiciones, adaptado de la referencia con la razón social
-- y la jurisdicción como placeholders {{RAZON_SOCIAL}} / {{JURISDICCION}} — la
-- página pública /terminos los reemplaza en vivo con lo que se cargue en el panel.
update config_storefront set terminos = $TERMS$
TÉRMINOS Y CONDICIONES generales aplicables al uso del contenido, productos y/o servicios ofrecidos a través del sitio web, en adelante "SITIO WEB", del cual es titular {{RAZON_SOCIAL}}. Para hacer uso del contenido, productos y/o servicios del sitio web el USUARIO deberá sujetarse a los presentes TÉRMINOS Y CONDICIONES.

I. OBJETO.

El objeto es regular el acceso y utilización del contenido, productos y/o servicios a disposición del público en general en el SITIO WEB. {{RAZON_SOCIAL}} podrá modificar en cualquier momento y sin previo aviso la presentación, los contenidos, la funcionalidad, los productos, los servicios y la configuración que pudiera estar contenida en el SITIO WEB; el usuario acepta dichas modificaciones. El acceso al sitio web por parte del usuario es libre y gratuito, no requiere de suscripción o registro alguno para el USUARIO.

El SITIO WEB solo admite el acceso a personas mayores de edad, en este sentido {{RAZON_SOCIAL}} no se hace responsable por el incumplimiento de esto.

El sitio web está dirigido a USUARIOS residentes en la República Mexicana, por lo que {{RAZON_SOCIAL}} no asegura que el SITIO WEB cumpla total o parcialmente con la legislación de otros países, de forma que si el usuario reside o tiene el domicilio en otro país y decide acceder o utilizar el SITIO WEB lo hará bajo su propia responsabilidad y deberá asegurarse de que tal acceso y navegación cumpla con la legislación local que le es aplicable, no asumiendo {{RAZON_SOCIAL}} ninguna responsabilidad que se pueda derivar de dicho acto.

La administración del SITIO WEB puede ejercerse por terceros, es decir, personas distintas al titular, sin afectar esto los presentes TÉRMINOS Y CONDICIONES.

II. USUARIO

La actividad del USUARIO en el SITIO WEB, como publicaciones o comentarios, estará sujeta a los presentes TÉRMINOS Y CONDICIONES. El USUARIO se compromete a utilizar el contenido, productos y/o servicios de forma lícita, sin faltar a la moral o al orden público, absteniéndose de realizar cualquier acto que afecte los derechos de terceros o el funcionamiento del SITIO WEB.

El USUARIO se compromete a proporcionar información verídica en los formularios del SITIO WEB. El acceso al SITIO WEB no supone una relación entre el USUARIO y el titular del SITIO WEB.

Al tratarse de un SITIO WEB dirigido exclusivamente a personas que cuentan con la mayoría de edad, el USUARIO manifiesta ser mayor de edad y disponer de la capacidad jurídica necesaria para sujetarse a los presentes TÉRMINOS Y CONDICIONES.

{{RAZON_SOCIAL}} se reserva el derecho de retirar todo aquel comentario o aportación que vulnere la ley, el respeto a la dignidad de la persona, que sea discriminatorio, atente contra los derechos de terceros o el orden público, o bien que a su juicio no resulte adecuado para su publicación.

En cualquier caso, {{RAZON_SOCIAL}} no será responsable de las opiniones vertidas por los USUARIOS a través de comentarios o publicaciones que estos realicen.

III. ACCESO Y NAVEGACIÓN EN EL SITIO WEB.

El titular no garantiza la continuidad y disponibilidad del contenido, productos y/o servicios en el SITIO WEB; no obstante, llevará a cabo las acciones que, de acuerdo a sus posibilidades, le permitan mantener el buen funcionamiento del SITIO WEB, sin que esto suponga alguna responsabilidad de parte de {{RAZON_SOCIAL}}. El titular no se responsabiliza de que el software esté libre de errores que puedan causar un daño al software y/o hardware del equipo desde el cual el usuario accede al sitio web. De igual forma, no se responsabiliza por los daños causados por el acceso y/o utilización del SITIO WEB.

El titular tampoco se hace responsable de los daños que pudiera ocasionar el uso inadecuado del SITIO WEB. En ningún caso {{RAZON_SOCIAL}} será responsable por la pérdida, daño o perjuicio de cualquier tipo que surja por el solo acceso o utilización del SITIO WEB.

IV. POLÍTICA DE PRIVACIDAD Y PROTECCIÓN DE DATOS.

Conforme a lo establecido en la Ley Federal de Protección de Datos Personales en Posesión de Particulares, el titular se compromete a tomar las medidas necesarias que estén a su alcance para asegurar la privacidad de los datos personales recabados, de forma que se garantice su seguridad y se evite su alteración, pérdida o tratamiento no autorizado. El titular corroborará que los datos personales contenidos en sus bases de datos sean correctos, verídicos y actuales, así como que se utilicen únicamente con el fin con el que fueron recabados. El tratamiento de datos personales se limitará al cumplimiento de las finalidades previstas en el Aviso de Privacidad.

{{RAZON_SOCIAL}} se reserva el derecho de realizar cualquier tipo de modificación en el Aviso de Privacidad en cualquier momento y sin previo aviso, de acuerdo con sus necesidades o cambios en la legislación aplicable; el usuario acepta dichas modificaciones. El SITIO WEB podrá incluir hipervínculos o enlaces a páginas web de terceros distintos de {{RAZON_SOCIAL}}. Los titulares de dichos sitios web disponen de sus propias políticas de privacidad y protección de datos, por lo que {{RAZON_SOCIAL}} no asume ningún tipo de responsabilidad por los datos que sean facilitados por el USUARIO a través de cualquier sitio web distinto al propio SITIO WEB.

El sitio web implica la utilización de cookies, que son pequeñas cantidades de información que se almacenan en el navegador utilizado por el usuario como datos de ingreso, preferencias del usuario, fecha y hora en que se accede al sitio web, sitios visitados y dirección IP; esta información es anónima y solo se utilizará para mejorar el SITIO WEB. Las cookies facilitan la navegación y la hacen más amigable; sin embargo, el usuario puede desactivarlas en cualquier momento desde su navegador, en el entendido de que esto puede afectar algunas funciones del SITIO WEB.

En caso de que el USUARIO no desee que se recopile este tipo de información, deberá deshabilitarlas o rechazarlas; estas acciones pueden diferir de un navegador a otro. Aun rechazando el uso de cookies (total o parcialmente), el USUARIO podrá continuar haciendo uso del SITIO WEB, aunque podrían quedar deshabilitadas algunas de sus funciones.

V. POLÍTICA DE ENLACES.

El sitio web puede contener enlaces a otros sitios de internet pertenecientes a terceros de los cuales no se hace responsable. La utilización de estos enlaces, contenidos o funciones tiene por objeto mejorar la experiencia del USUARIO al hacer uso del SITIO WEB, sin que pueda considerarse una sugerencia, recomendación o invitación para hacer uso del sitio externo. {{RAZON_SOCIAL}} en ningún caso revisará o controlará el contenido de los sitios externos; de igual forma, no hace propios los productos, servicios, contenidos y cualquier otro material existente en los referidos sitios enlazados. El titular no asume ninguna responsabilidad por los daños y perjuicios que pudieran producirse por el acceso o uso de los contenidos, productos o servicios disponibles en sitios web no gestionados por {{RAZON_SOCIAL}} a los que se pueda acceder mediante el SITIO WEB.

VI. POLÍTICA DE PROPIEDAD INTELECTUAL E INDUSTRIAL.

El titular manifiesta tener los derechos de propiedad intelectual e industrial del SITIO WEB, incluyendo imágenes, archivos de audio o video, logotipos, marcas, colores, estructuras, tipografías, diseños y demás elementos que lo distinguen, protegidos por la legislación mexicana e internacional en materia de propiedad intelectual e industrial.

El USUARIO se compromete a respetar los derechos de propiedad industrial e intelectual del titular, pudiendo visualizar los elementos del sitio web, almacenarlos, copiarlos e imprimirlos exclusivamente para uso personal.

VII. LEGISLACIÓN Y JURISDICCIÓN APLICABLE.

{{RAZON_SOCIAL}} se reserva la facultad de presentar las acciones civiles o penales que considere necesarias por la utilización indebida del SITIO WEB, su contenido, productos o servicios, o por el incumplimiento de los presentes TÉRMINOS Y CONDICIONES. La relación entre el usuario y el titular se regirá por la legislación vigente en México, específicamente en {{JURISDICCION}}. De surgir cualquier controversia en relación con la interpretación y/o la aplicación de los presentes TÉRMINOS Y CONDICIONES, las partes se someten a la jurisdicción ordinaria de los tribunales que correspondan conforme a derecho en {{JURISDICCION}}.
$TERMS$,
updated_at = now()
where id = 1;
