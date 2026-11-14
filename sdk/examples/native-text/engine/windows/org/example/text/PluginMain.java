package org.example.text;
import org.json.JSONObject;import java.io.*;import java.nio.charset.StandardCharsets;
/** MIT. Public SDK line protocol, executed by the generic Windows adapter. */
public final class PluginMain {
 public static void main(String[] args)throws Exception{BufferedReader input=new BufferedReader(new InputStreamReader(System.in,StandardCharsets.UTF_8));PrintWriter output=new PrintWriter(new OutputStreamWriter(System.out,StandardCharsets.UTF_8),true);String line;while((line=input.readLine())!=null){JSONObject response=new JSONObject();try{JSONObject p=new JSONObject(line);response.put("value",TextService.execute(p.getString("method"),p.optJSONObject("params")==null?new JSONObject():p.getJSONObject("params")));}catch(Exception e){response.put("error",e.getMessage());}output.println(response);}}
}
