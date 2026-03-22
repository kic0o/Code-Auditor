def consolidate_results(ai_responses: list, total_files: int) -> dict:
    """
    Toma las respuestas individuales de la IA y genera el reporte maestro.
    """
    master_report = {
        "total_score": 100,
        "files_analyzed": total_files,
        "critical_issues": 0,
        "warnings": 0,
        "info_suggestions": 0,
        "findings": []
    }
    
    total_penalty = 0

    for response in ai_responses:
        for finding in response.get("findings", []):
            master_report["findings"].append(finding)
            
            if finding["severity"] == "critical":
                master_report["critical_issues"] += 1
                total_penalty += 20
            elif finding["severity"] == "warning":
                master_report["warnings"] += 1
                total_penalty += 5
            elif finding["severity"] == "info":
                master_report["info_suggestions"] += 1
                total_penalty += 1

    master_report["total_score"] = max(0, 100 - total_penalty)
    
    return master_report