package org.example.text;
import org.json.JSONObject;import java.nio.charset.StandardCharsets;import java.security.MessageDigest;
/** MIT. Uses only JDK/Android JSON; no Nous application or downloader dependencies. */
public final class TextService {
 public static JSONObject execute(String method,JSONObject params)throws Exception{if(!method.equals("text.inspect"))throw new IllegalArgumentException("Unsupported plugin method");String text=params.getString("text");if(text.length()>30000)throw new IllegalArgumentException("Text too long");StringBuilder hash=new StringBuilder();for(byte b:MessageDigest.getInstance("SHA-256").digest(text.getBytes(StandardCharsets.UTF_8)))hash.append(String.format(java.util.Locale.ROOT,"%02x",b&255));return new JSONObject().put("characters",text.codePointCount(0,text.length())).put("words",text.trim().isEmpty()?0:text.trim().split("\\s+").length).put("sha256",hash.toString());}
}
